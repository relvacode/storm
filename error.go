package storm

import (
	"fmt"
	"net/http"
)

// HTTPError is an error that extends the built-in Go error with status code hinting.
type HTTPError interface {
	error
	StatusCode() int
}

type RPCError struct {
	ExceptionType    string
	ExceptionMessage string
}

func (RPCError) StatusCode() int {
	return http.StatusInternalServerError
}

func (e RPCError) Error() string {
	return fmt.Sprintf("%s: %s", e.ExceptionType, e.ExceptionMessage)
}

var _ HTTPError = (*Error)(nil)

// Hint wraps an input error to hint the HTTP status code.
// If err already implements HTTPError then that error is used directly
func Hint(code int, err error) error {
	if httpError, ok := err.(HTTPError); ok {
		return httpError
	}

	return &Error{
		Message: err.Error(),
		Code:    code,
	}
}

type Error struct {
	Message string
	Code    int
}

func (e *Error) Error() string {
	return e.Message
}

func (e *Error) StatusCode() int {
	return e.Code
}

type errorResponse struct {
	Error string
}

// SendError sends an error back to the client.
// If err implements HTTPError then that status code is used. Otherwise HTTP InternalServerError is sent.
// It delivers the error message as the errorResponse payload.
func SendError(rw http.ResponseWriter, err error) {
	var (
		code     = http.StatusInternalServerError
		response = errorResponse{
			Error: err.Error(),
		}
	)

	if httpError, ok := err.(HTTPError); ok {
		code = httpError.StatusCode()
	}

	if wr, ok := rw.(*WrappedResponse); ok {
		wr.error = err
	}

	Send(rw, code, &response)
}
