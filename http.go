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

func Handle(rw http.ResponseWriter, r *http.Request, handler HandlerFunc) error {
	response, err := handler(r)
	if err != nil {
		SendError(rw, err)
		return err
	}

	if response == nil {
		NoContent(rw)
		return nil
	}

	Send(rw, http.StatusOK, response)
	return nil
}
