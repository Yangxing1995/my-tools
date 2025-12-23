package json

type FormatRequest struct {
	JSON   string `json:"json" binding:"required"`
	Indent int    `json:"indent"`
}

type FormatResponse struct {
	Formatted string `json:"formatted"`
}

type MinifyRequest struct {
	JSON string `json:"json" binding:"required"`
}

type MinifyResponse struct {
	Minified string `json:"minified"`
}
