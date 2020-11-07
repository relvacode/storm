package storm

import (
	"encoding/json"
	"io"
	"net/http"
)

const (
	// MaxRequest size is the maximum allowed request size in bytes
	MaxRequestSize = 5 << 20
)

// Read reads JSON data from the request.
func Read(r *http.Request, into interface{}) error {
	var lr = io.LimitReader(r.Body, MaxRequestSize).(*io.LimitedReader)
	var dec = json.NewDecoder(lr)
	var err = dec.Decode(into)

	_ = r.Body.Close()

	// Request too large (limited reader fully consumed)
	if lr.N < 1 {
		return &Error{Code: http.StatusRequestEntityTooLarge, Message: "Request payload exceeds maximum limit"}
	}

	if err != nil {
		return Hint(http.StatusBadRequest, err)
	}

	return nil
}
