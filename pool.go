package storm

import (
	"context"
	"errors"
	deluge "github.com/gdm85/go-libdeluge"
	"go.uber.org/zap"
	"sync"
	"time"
)

type DelugeProvider func() deluge.DelugeClient

type poolReq struct {
	// If the context has been cancelled then no connection is returned
	ctx context.Context
	// The replied client may be nil if the connection could not be established
	reply chan<- deluge.DelugeClient
}

func (req *poolReq) Send(conn deluge.DelugeClient) bool {
	select {
	case <-req.ctx.Done():
		return false
	case req.reply <- conn:
		return true
	}
}

type idleConnection struct {
	idle time.Time
	conn deluge.DelugeClient
}

type Timer interface {
	Ch() <-chan time.Time
	Stop() bool
}

type timeTimer time.Timer

func (t *timeTimer) Ch() <-chan time.Time {
	return (*time.Timer)(t).C
}

func (t *timeTimer) Stop() bool {
	return (*time.Timer)(t).Stop()
}

type nullTimer struct{}

func (nullTimer) Ch() <-chan time.Time {
	return nil
}

func (nullTimer) Stop() bool {
	return true
}

func NewConnectionPool(log *zap.Logger, maxConnections int, idleConnectionTime time.Duration, provider DelugeProvider) *ConnectionPool {
	pool := &ConnectionPool{
		Log:                log,
		MaxConnections:     maxConnections,
		IdleConnectionTime: idleConnectionTime,
		Provider:           provider,

		get:   make(chan *poolReq),
		put:   make(chan deluge.DelugeClient),
		close: make(chan struct{}),
		alive: new(sync.Mutex),
		idle:  nullTimer{},
	}

	go pool.worker()
	return pool
}

type ConnectionPool struct {
	Log                *zap.Logger
	MaxConnections     int
	IdleConnectionTime time.Duration
	Provider           DelugeProvider

	get   chan *poolReq
	put   chan deluge.DelugeClient
	close chan struct{}
	alive *sync.Mutex

	waitConn []*poolReq
	inFlight int
	pool     []*idleConnection
	idle     Timer
}

func (pool *ConnectionPool) nextIdle() {
	// Go through the other connections.
	// Check that they are not expired, if not set the new idle to the first valid connection
	for {
		if len(pool.pool) == 0 {
			// Otherwise, there are no more connections to make idle
			pool.idle = nullTimer{}
			return
		}

		conn := pool.pool[0]
		expires := conn.idle.Sub(time.Now())

		// Next connection is now idle. Delete it.
		if expires < 0 {
			err := conn.conn.Close()
			if err != nil {
				pool.Log.Error("Failed to closed idle connection", zap.Error(err))
			}

			pool.pool = pool.pool[1:]
			continue
		}

		// Valid connection that is not idle
		t := time.NewTimer(expires)
		pool.idle = (*timeTimer)(t)
		return
	}
}

func (pool *ConnectionPool) idleExpired() {
	var conn *idleConnection
	conn, pool.pool = pool.pool[0], pool.pool[1:]

	err := conn.conn.Close()
	if err != nil {
		pool.Log.Error("Failed to closed idle connection", zap.Error(err))
	}

	pool.idle.Stop()
	pool.nextIdle()
}

func (pool *ConnectionPool) putConn(conn deluge.DelugeClient) {
	// Check if anyone is waiting for a connection
	for len(pool.waitConn) > 0 {

		w := pool.waitConn[0]
		pool.waitConn[0] = nil
		pool.waitConn = pool.waitConn[1:]

		select {
		case <-w.ctx.Done(): // waiter's connection has been cancelled
		case w.reply <- conn: // waiter has received connection
			return
		}
	}

	idle := &idleConnection{idle: time.Now().Add(pool.IdleConnectionTime), conn: conn}

	// There are no existing connections in the pool.
	// Set the new pool timer
	if len(pool.pool) == 0 {
		pool.idle.Stop()

		t := time.NewTimer(pool.IdleConnectionTime)
		pool.idle = (*timeTimer)(t)
	}

	pool.pool = append(pool.pool, idle)
	pool.inFlight--
}

func (pool *ConnectionPool) closeConns() {
	pool.idle.Stop()
	pool.idle = nullTimer{}

	// Close any waiters
	for len(pool.waitConn) > 0 {
		var w *poolReq
		w, pool.waitConn = pool.waitConn[0], pool.waitConn[1:]
		close(w.reply)
	}

	// Close all connections within the pool
	for len(pool.pool) > 0 {
		var c *idleConnection
		c, pool.pool = pool.pool[0], pool.pool[1:]
		_ = c.conn.Close()
	}
}

func (pool *ConnectionPool) getConn(req *poolReq) {
	// There are connections that can be sent straight away
	if len(pool.pool) > 0 {
		c := pool.pool[0]

		if req.Send(c.conn) {
			// Connection successfully sent
			pool.pool = pool.pool[1:]
			pool.inFlight++

			pool.idle.Stop()
			pool.nextIdle()
		}

		return
	}

	// There are more connections in-flight.
	// Add the request to the list of waiting requests.
	if pool.inFlight >= pool.MaxConnections {
		pool.waitConn = append(pool.waitConn, req)
		return
	}

	// A new connection can be established
	conn := pool.Provider()

	err := conn.Connect()
	if err != nil {
		pool.Log.Error("Failed to establish Deluge RPC connection", zap.Error(err))
		conn = nil
	}

	ok := req.Send(conn)

	// The connection was nil so we don't care what the send response was
	if conn == nil {
		return
	}

	pool.inFlight++

	// Connection successfully sent
	if ok {
		return
	}

	// Connection was established but could not be sent to the caller
	// Put the established connection into the pool
	pool.putConn(conn)
}

func (pool *ConnectionPool) worker() {
	pool.alive.Lock()
	defer pool.alive.Unlock()

	for {
		select {
		case <-pool.idle.Ch(): // The first connection is now idle
			pool.idleExpired()
		case req := <-pool.get:
			pool.getConn(req)
		case conn := <-pool.put: // A connection has been put back
			pool.putConn(conn)
		case <-pool.close:
			pool.closeConns()
			return
		}
	}
}

// Get gets a connected connection from the pool.
// If there are no available connections in the pool then one is created and connected to.
// If there already too many active connections, Get will block until a connection is available
// or the given context is cancelled.
func (pool *ConnectionPool) Get(ctx context.Context) (deluge.DelugeClient, error) {
	// TODO someone needs to close this
	replyCh := make(chan deluge.DelugeClient)
	pool.get <- &poolReq{ctx: ctx, reply: replyCh}

	select {
	case <-pool.close:
		return nil, errors.New("The Deluge RPC connection pool has been closed")
	case <-ctx.Done():
		return nil, ctx.Err()
	case conn := <-replyCh:
		if conn == nil {
			return nil, errors.New("A connection to the Deluge RPC daemon could not be established by the connection pool")
		}

		return conn, nil
	}
}

// Put puts a connection back to the pool.
func (pool *ConnectionPool) Put(conn deluge.DelugeClient) {
	select {
	case <-pool.close:
		// Pool has been closed before the connection can be put back
		_ = conn.Close()
	case pool.put <- conn:
	}
}

func (pool *ConnectionPool) Close() {
	close(pool.close)

	// Achieve a lock on the pool alive mutex.
	// When a lock is achieved the pool worker daemon has been closed.
	// Keep the alive mutex locked.
	pool.alive.Lock()
}
