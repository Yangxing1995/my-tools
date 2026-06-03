package csr

type FormatCSRRequest struct {
	CSR string `json:"csr" binding:"required"`
}

type FormatCSRResponse struct {
	PEM string `json:"pem"`
}

type ParseCSRRequest struct {
	CSR string `json:"csr" binding:"required"`
}

type ParseCSRResponse struct {
	PEM                string   `json:"pem"`
	Subject            string   `json:"subject"`
	CommonName         string   `json:"commonName"`
	Country            []string `json:"country"`
	Organization       []string `json:"organization"`
	OrganizationalUnit []string `json:"organizationalUnit"`
	Locality           []string `json:"locality"`
	Province           []string `json:"province"`
	DNSNames           []string `json:"dnsNames"`
	EmailAddresses     []string `json:"emailAddresses"`
	IPAddresses        []string `json:"ipAddresses"`
	URIs               []string `json:"uris"`
	PublicKeyAlgorithm string   `json:"publicKeyAlgorithm"`
	PublicKeySize      int      `json:"publicKeySize"`
	SignatureAlgorithm string   `json:"signatureAlgorithm"`
}
