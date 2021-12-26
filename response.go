package storm

import (
	"net/http"
	"time"
)

var _ http.ResponseWriter = (*WrappedResponse)(nil)

// WrapResponse wraps a response
func WrapResponse(rw http.ResponseWriter) *WrappedResponse {
	return &WrappedResponse{
		ResponseWriter: rw,
		started:        time.Now().UTC(),
	}
}

// WrappedResponse wraps a http.ResponseWriter to capture information about the response
type WrappedResponse struct {
	http.ResponseWriter

	started time.Time
	sent    time.Time

	code        int
	error       error
	payloadSize int
}

func (rw *WrappedResponse) WriteHeader(code int) {
	rw.code = code
	rw.sent = time.Now().UTC()
	rw.ResponseWriter.WriteHeader(code)

	// Set error based off the status text if an explicit error is not otherwise provided
	if code > 399 && rw.error == nil {
		rw.error = &Error{
			Code:    code,
			Message: http.StatusText(code),
		}
	}
}

func (rw *WrappedResponse) Write(b []byte) (int, error) {
	wr, err := rw.ResponseWriter.Write(b)
	rw.payloadSize += wr
	return wr, err
}

func (rw *WrappedResponse) Code() int {
	return rw.code
}

func (rw *WrappedResponse) Started() time.Time {
	return rw.started
}

// Duration returns the total duration of the request to response.
func (rw *WrappedResponse) Duration() time.Duration {
	return rw.sent.Sub(rw.started)
}

// Len returns the total payload size in bytes.
func (rw *WrappedResponse) Len() int {
	return rw.payloadSize
}

func (rw *WrappedResponse) Error() error {
	return rw.error
}
