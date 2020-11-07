package deluge_api

import (
	"net/http"
	"time"
)

var _ http.ResponseWriter = (*ResponseWriter)(nil)

func WrapResponse(rw http.ResponseWriter) *ResponseWriter {
	return &ResponseWriter{
		ResponseWriter: rw,
		started:        time.Now().UTC(),
	}
}

// ResponseWriter wraps an http.ResponseWriter to provide additional information the response.
// Such as:
//  - Processing Time
//  - HTTP response code
//  - Response payload size
type ResponseWriter struct {
	http.ResponseWriter

	started time.Time
	sent    time.Time

	code        int
	payloadSize int
}

func (rw *ResponseWriter) WriteHeader(code int) {
	rw.code = code
	rw.sent = time.Now().UTC()
	rw.ResponseWriter.WriteHeader(code)
}

func (rw *ResponseWriter) Write(b []byte) (int, error) {
	wr, err := rw.ResponseWriter.Write(b)
	rw.payloadSize += wr
	return wr, err
}

func (rw *ResponseWriter) Code() int {
	return rw.code
}

func (rw *ResponseWriter) Started() time.Time {
	return rw.started
}

// Duration returns the total duration of the request to response.
func (rw *ResponseWriter) Duration() time.Duration {
	return rw.sent.Sub(rw.started)
}

// Len returns the total payload size in bytes.
func (rw *ResponseWriter) Len() int {
	return rw.payloadSize
}
