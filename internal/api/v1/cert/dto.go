package cert

import "time"

type SplitCertChainRequest struct {
	CertChain string `json:"certChain" binding:"required"`
}

type CertDetail struct {
	PEM          string    `json:"pem"`
	Subject      string    `json:"subject"`
	Issuer       string    `json:"issuer"`
	NotBefore    time.Time `json:"notBefore"`
	NotAfter     time.Time `json:"notAfter"`
	SerialNumber string    `json:"serialNumber"`
	Sha1         string    `json:"sha1"`
	Version      int       `json:"version"`
	IsCA         bool      `json:"isCA"`
}

type SplitCertChainResponse struct {
	Certs []CertDetail `json:"certs"`
	Count int          `json:"count"`
}
