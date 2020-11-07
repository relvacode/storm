package storm

import (
	"encoding/json"
	"net/http"
)

// HandlerFunc is an adaptor for the http.HandlerFunc that returns JSON data.
type HandlerFunc func(r *http.Request) (interface{}, error)

// Send sends JSON data to the client using the supplied HTTP status code.
func Send(rw http.ResponseWriter, code int, data interface{}) {
	enc := json.NewEncoder(rw)
	enc.SetIndent("", "  ")

	rw.Header().Set("Content-Type", "application/json")
	rw.WriteHeader(code)

	_ = enc.Encode(data)
}

// NoContent sends a 204 No Content response
func NoContent(rw http.ResponseWriter) {
	rw.WriteHeader(http.StatusNoContent)
}

// Adaptor converts a HandlerFunc into an http.HandlerFunc.
// If the function returns an error that error is delivered.
// If the function returns a non-nil interface that value is delivered as JSON using the HTTP OK response code.
// If the function returns a nil error and a nil interface then HTTP No Content is delivered.
func Adaptor(f HandlerFunc) http.HandlerFunc {
	return func(rw http.ResponseWriter, r *http.Request) {
		response, err := f(r)
		if err != nil {
			SendError(rw, err)
			return
		}

		if response == nil {
			NoContent(rw)
			return
		}

		Send(rw, http.StatusOK, response)
	}
}
