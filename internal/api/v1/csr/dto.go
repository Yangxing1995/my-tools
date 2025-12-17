package csr

type FormatCSRRequest struct {
	CSR string `json:"csr" binding:"required"`
}

type FormatCSRResponse struct {
	PEM string `json:"pem"`
}
