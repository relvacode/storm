package deluge_api

import (
	"github.com/gobuffalo/packr"
)

var Static = packr.NewBox("./frontend/dist")
