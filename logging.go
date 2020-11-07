package deluge_api

import (
	"go.uber.org/zap"
	"net/http"
)

// Log logs execution of an http.HandlerFunc to the given zap.Logger.
func Log(log *zap.Logger, f http.HandlerFunc) http.HandlerFunc {
	return func(rw http.ResponseWriter, r *http.Request) {
		wrapped := WrapResponse(rw)

		f(wrapped, r)

		log.Info(
			http.StatusText(wrapped.Code()),
			zap.String("Method", r.Method),
			zap.String("URL", r.URL.String()),
			zap.String("RemoteAddr", r.RemoteAddr),
			zap.Time("Started", wrapped.Started()),
			zap.Int("StatusCode", wrapped.code),
			zap.Int("ResponseSize", wrapped.Len()),
			zap.Duration("Duration", wrapped.Duration()),
		)
	}
}
