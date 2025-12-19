package cert

type SplitCertChainRequest struct {
	CertChain string `json:"certChain" binding:"required"`
}

type SplitCertChainResponse struct {
	Certs []string `json:"certs"`
	Count int      `json:"count"`
}
