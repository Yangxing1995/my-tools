package csr

import (
	"crypto/rsa"
	"crypto/x509"
	"encoding/pem"
	"errors"
	"net"
	"net/url"
	"strings"
)

const (
	pemHeader = "-----BEGIN CERTIFICATE REQUEST-----"
	pemFooter = "-----END CERTIFICATE REQUEST-----"
)

func NormalizeCSRPEM(input string) (string, error) {
	in := strings.TrimSpace(input)
	if in == "" {
		return "", errors.New("csr is empty")
	}

	in = strings.ReplaceAll(in, "\\r\\n", "\n")
	in = strings.ReplaceAll(in, "\\n", "\n")
	in = strings.ReplaceAll(in, "\r\n", "\n")
	in = strings.ReplaceAll(in, "\r", "\n")

	body := extractCSRBody(in)
	body = stripWhitespace(body)
	if body == "" {
		return "", errors.New("csr body is empty")
	}

	wrapped := wrap64(body)
	return pemHeader + "\n" + wrapped + pemFooter + "\n", nil
}

type Info struct {
	PEM                string
	Subject            string
	CommonName         string
	Country            []string
	Organization       []string
	OrganizationalUnit []string
	Locality           []string
	Province           []string
	DNSNames           []string
	EmailAddresses     []string
	IPAddresses        []string
	URIs               []string
	PublicKeyAlgorithm string
	PublicKeySize      int
	SignatureAlgorithm string
}

func ParseCSR(input string) (Info, error) {
	normalized, err := NormalizeCSRPEM(input)
	if err != nil {
		return Info{}, err
	}

	block, _ := pem.Decode([]byte(normalized))
	if block == nil {
		return Info{}, errors.New("failed to decode CSR PEM block")
	}

	req, err := x509.ParseCertificateRequest(block.Bytes)
	if err != nil {
		return Info{}, err
	}

	if err := req.CheckSignature(); err != nil {
		return Info{}, err
	}

	return Info{
		PEM:                normalized,
		Subject:            req.Subject.String(),
		CommonName:         req.Subject.CommonName,
		Country:            req.Subject.Country,
		Organization:       req.Subject.Organization,
		OrganizationalUnit: req.Subject.OrganizationalUnit,
		Locality:           req.Subject.Locality,
		Province:           req.Subject.Province,
		DNSNames:           req.DNSNames,
		EmailAddresses:     req.EmailAddresses,
		IPAddresses:        stringifyIPs(req.IPAddresses),
		URIs:               stringifyURIs(req.URIs),
		PublicKeyAlgorithm: req.PublicKeyAlgorithm.String(),
		PublicKeySize:      publicKeySize(req.PublicKey),
		SignatureAlgorithm: req.SignatureAlgorithm.String(),
	}, nil
}

func extractCSRBody(in string) string {
	if !strings.Contains(in, pemHeader) || !strings.Contains(in, pemFooter) {
		return in
	}
	start := strings.Index(in, pemHeader)
	if start == -1 {
		return in
	}
	start += len(pemHeader)

	end := strings.Index(in[start:], pemFooter)
	if end == -1 {
		return in
	}
	end = start + end

	return strings.TrimSpace(in[start:end])
}

func stripWhitespace(s string) string {
	// Remove spaces, tabs and newlines.
	replacer := strings.NewReplacer(
		"\n", "",
		"\t", "",
		" ", "",
	)
	return replacer.Replace(strings.TrimSpace(s))
}

func wrap64(s string) string {
	const line = 64
	var b strings.Builder
	for i := 0; i < len(s); i += line {
		end := i + line
		if end > len(s) {
			end = len(s)
		}
		b.WriteString(s[i:end])
		b.WriteString("\n")
	}
	return b.String()
}

func stringifyIPs(ips []net.IP) []string {
	out := make([]string, 0, len(ips))
	for _, ip := range ips {
		out = append(out, ip.String())
	}
	return out
}

func stringifyURIs(uris []*url.URL) []string {
	out := make([]string, 0, len(uris))
	for _, uri := range uris {
		out = append(out, uri.String())
	}
	return out
}

func publicKeySize(publicKey any) int {
	switch key := publicKey.(type) {
	case *rsa.PublicKey:
		return key.N.BitLen()
	default:
		return 0
	}
}
