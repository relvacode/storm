package storm

import (
	"embed"
)

//go:embed frontend/dist/*
var Static embed.FS
