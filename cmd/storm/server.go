package main

import (
	"context"
	"fmt"
	deluge "github.com/gdm85/go-libdeluge"
	"github.com/jessevdk/go-flags"
	storm "github.com/relvacode/storm"
	"go.uber.org/zap"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"
)

func signalContext(ctx context.Context) context.Context {
	sig := make(chan os.Signal, 1)
	signal.Notify(sig, os.Interrupt, syscall.SIGTERM)

	xCtx, cancel := context.WithCancel(ctx)
	go func() {
		select {
		case <-ctx.Done():
		case <-sig:
			cancel()
		}
		signal.Stop(sig)
	}()

	return xCtx
}

type Duration struct {
	Duration time.Duration
}

func (dur *Duration) UnmarshalFlag(value string) (err error) {
	dur.Duration, err = time.ParseDuration(value)
	return
}

type Path string

func (p *Path) UnmarshalFlag(value string) error {
	if strings.HasSuffix(value, "/") {
		value = strings.TrimSuffix(value, "/")
	}
	if !strings.HasPrefix(value, "/") {
		value = fmt.Sprint("/", value)
	}

	*p = Path(value)
	return nil
}

type ServerOptions struct {
	Listen          string `short:"l" long:"listen" default:":8221" env:"LISTEN_ADDR" description:"The address for the HTTP server"`
	LogStyle        string `long:"log-style" choice:"production" choice:"console" default:"console" env:"LOGGING_STYLE" description:"The style of log messages"`
	BasePath        *Path  `long:"base-path" required:"true" default:"/" env:"STORM_BASE_PATH" description:"Respond to requests from this base URL path"`
	ApiKey          string `long:"api-key" env:"STORM_API_KEY" description:"Set the password required to access the API (enables authentication)"`
	DevelopmentMode bool   `long:"dev-mode" env:"DEV_MODE" description:"Run in development mode"`
}

func (options *ServerOptions) Logger() (*zap.Logger, error) {
	var cfg zap.Config
	switch options.LogStyle {
	case "production":
		cfg = zap.NewProductionConfig()
	case "console":
		cfg = zap.NewDevelopmentConfig()
	default:
		panic("Invalid LogStyle choice")
	}

	cfg.DisableStacktrace = true
	return cfg.Build()
}

func (options *ServerOptions) RunHandler(ctx context.Context, log *zap.Logger, handler http.Handler) error {
	var (
		errors = make(chan error, 1)
		server = &http.Server{
			Addr:    options.Listen,
			Handler: handler,
		}
	)

	go func() {
		errors <- server.ListenAndServe()
	}()

	log.Info(fmt.Sprintf("Ready to serve HTTP connections on %s%s", options.Listen, *options.BasePath))

	defer close(errors)

	select {
	case <-ctx.Done():
		log.Error("Interrupt signal received. Gracefully shutting down...")
		timeout, cancel := context.WithTimeout(context.Background(), time.Minute)
		_ = server.Shutdown(timeout)
		cancel()
	case err := <-errors:
		return err
	}

	return <-errors
}

type DelugeOptions struct {
	Version  string `long:"deluge-version" choice:"v1" choice:"v2" default:"v1" env:"DELUGE_RPC_VERSION" description:"The Deluge RPC version"`
	Hostname string `short:"H" long:"hostname" required:"true" env:"DELUGE_RPC_HOSTNAME" description:"The Deluge RPC hostname"`
	Port     uint   `short:"P" long:"port" default:"58846" env:"DELUGE_RPC_PORT" description:"The Deluge RPC port"`
	Username string `short:"u" long:"username" env:"DELUGE_RPC_USERNAME" description:"The Deluge RPC username"`
	Password string `short:"p" long:"password" env:"DELUGE_RPC_PASSWORD" description:"The Deluge RPC password"`

	MaxConnections int       `long:"max-connections" env:"POOL_MAX_CONNECTIONS" required:"true" default:"5" description:"Maximum concurrent Deluge RPC connections"`
	IdleTime       *Duration `long:"idle-time" env:"POOL_IDLE_TIME" required:"true" default:"30s" description:"Close idle Deluge RPC connections after this duration"`
}

func (options *DelugeOptions) Client() storm.DelugeProvider {
	var settings = deluge.Settings{
		Hostname:         options.Hostname,
		Port:             options.Port,
		Login:            options.Username,
		Password:         options.Password,
		ReadWriteTimeout: time.Minute * 5,
	}

	return func() deluge.DelugeClient {

		switch options.Version {
		case "v1":
			return deluge.NewV1(settings)
		case "v2":
			return deluge.NewV2(settings)
		default:
			panic("Invalid Version choice")
		}
	}
}

func (options *DelugeOptions) Pool(log *zap.Logger) *storm.ConnectionPool {
	return storm.NewConnectionPool(log, options.MaxConnections, options.IdleTime.Duration, options.Client())
}

type Options struct {
	ServerOptions
	DelugeOptions
}

func Main() error {
	var options Options
	var parser = flags.NewParser(&options, flags.HelpFlag)

	_, err := parser.Parse()
	if err != nil {
		return err
	}

	log, err := (&options.ServerOptions).Logger()
	if err != nil {
		return err
	}

	defer log.Sync()

	ctx := signalContext(context.Background())

	pool := (&options.DelugeOptions).Pool(log.Named("pool"))
	defer pool.Close()

	if options.DevelopmentMode {
		log.Info("Running in development mode")
	}

	var (
		apiLog = log.Named("api")
		api    = storm.New(apiLog, pool, (string)(*options.BasePath), options.ServerOptions.ApiKey, options.DevelopmentMode)
	)

	return (&options.ServerOptions).RunHandler(ctx, apiLog, api)
}

func main() {
	err := Main()
	if err != nil {
		_, _ = fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
