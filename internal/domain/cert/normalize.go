package cert

import (
	"crypto/x509"
	"encoding/pem"
	"errors"
	"strings"
	"time"
)

const (
	certPEMHeader = "-----BEGIN CERTIFICATE-----"
	certPEMFooter = "-----END CERTIFICATE-----"
)

// NormalizeCertPEM 格式化单个证书PEM
func NormalizeCertPEM(input string) (string, error) {
	in := strings.TrimSpace(input)
	if in == "" {
		return "", errors.New("certificate is empty")
	}

	in = strings.ReplaceAll(in, "\\r\\n", "\n")
	in = strings.ReplaceAll(in, "\\n", "\n")
	in = strings.ReplaceAll(in, "\r\n", "\n")
	in = strings.ReplaceAll(in, "\r", "\n")

	body := extractCertBody(in)
	body = stripWhitespace(body)
	if body == "" {
		return "", errors.New("certificate body is empty")
	}

	wrapped := wrap64(body)
	return certPEMHeader + "\n" + wrapped + certPEMFooter + "\n", nil
}

// SplitCertChain 将证书链拆分成多个独立的证书
func SplitCertChain(input string) ([]string, error) {
	in := strings.TrimSpace(input)
	if in == "" {
		return nil, errors.New("certificate chain is empty")
	}

	// 处理转义字符
	in = strings.ReplaceAll(in, "\\r\\n", "\n")
	in = strings.ReplaceAll(in, "\\n", "\n")
	in = strings.ReplaceAll(in, "\r\n", "\n")
	in = strings.ReplaceAll(in, "\r", "\n")

	var certs []string
	current := 0

	for {
		// 查找下一个证书开始位置
		start := strings.Index(in[current:], certPEMHeader)
		if start == -1 {
			break
		}
		start += current

		// 查找对应的结束位置
		end := strings.Index(in[start+len(certPEMHeader):], certPEMFooter)
		if end == -1 {
			return nil, errors.New("incomplete certificate found: missing footer")
		}
		end = start + len(certPEMHeader) + end + len(certPEMFooter)

		// 提取证书内容
		certPEM := strings.TrimSpace(in[start:end])

		// 格式化证书
		normalized, err := NormalizeCertPEM(certPEM)
		if err != nil {
			return nil, err
		}

		certs = append(certs, normalized)
		current = end
	}

	if len(certs) == 0 {
		return nil, errors.New("no valid certificates found")
	}

	return certs, nil
}

// CertInfo 证书信息
type CertInfo struct {
	PEM          string    `json:"pem"`
	Subject      string    `json:"subject"`
	Issuer       string    `json:"issuer"`
	NotBefore    time.Time `json:"notBefore"`
	NotAfter     time.Time `json:"notAfter"`
	SerialNumber string    `json:"serialNumber"`
	Version      int       `json:"version"`
	IsCA         bool      `json:"isCA"`
}

// SplitCertChainWithInfo 将证书链拆分成多个独立的证书并解析信息
func SplitCertChainWithInfo(input string) ([]CertInfo, error) {
	in := strings.TrimSpace(input)
	if in == "" {
		return nil, errors.New("certificate chain is empty")
	}

	// 处理转义字符
	in = strings.ReplaceAll(in, "\\r\\n", "\n")
	in = strings.ReplaceAll(in, "\\n", "\n")
	in = strings.ReplaceAll(in, "\r\n", "\n")
	in = strings.ReplaceAll(in, "\r", "\n")

	var certInfos []CertInfo
	current := 0

	for {
		// 查找下一个证书开始位置
		start := strings.Index(in[current:], certPEMHeader)
		if start == -1 {
			break
		}
		start += current

		// 查找对应的结束位置
		end := strings.Index(in[start+len(certPEMHeader):], certPEMFooter)
		if end == -1 {
			return nil, errors.New("incomplete certificate found: missing footer")
		}
		end = start + len(certPEMHeader) + end + len(certPEMFooter)

		// 提取证书内容
		certPEM := strings.TrimSpace(in[start:end])

		// 格式化证书
		normalized, err := NormalizeCertPEM(certPEM)
		if err != nil {
			return nil, err
		}

		// 解析证书信息
		info, err := parseCertInfo(normalized)
		if err != nil {
			return nil, err
		}

		certInfos = append(certInfos, info)
		current = end
	}

	if len(certInfos) == 0 {
		return nil, errors.New("no valid certificates found")
	}

	return certInfos, nil
}

// parseCertInfo 解析证书信息
func parseCertInfo(certPEM string) (CertInfo, error) {
	block, _ := pem.Decode([]byte(certPEM))
	if block == nil {
		return CertInfo{}, errors.New("failed to decode PEM block")
	}

	cert, err := x509.ParseCertificate(block.Bytes)
	if err != nil {
		return CertInfo{}, err
	}

	return CertInfo{
		PEM:          certPEM,
		Subject:      cert.Subject.String(),
		Issuer:       cert.Issuer.String(),
		NotBefore:    cert.NotBefore,
		NotAfter:     cert.NotAfter,
		SerialNumber: cert.SerialNumber.String(),
		Version:      cert.Version,
		IsCA:         cert.IsCA,
	}, nil
}

func extractCertBody(in string) string {
	if !strings.Contains(in, certPEMHeader) || !strings.Contains(in, certPEMFooter) {
		return in
	}
	start := strings.Index(in, certPEMHeader)
	if start == -1 {
		return in
	}
	start += len(certPEMHeader)

	end := strings.Index(in[start:], certPEMFooter)
	if end == -1 {
		return in
	}
	end = start + end

	return strings.TrimSpace(in[start:end])
}

func stripWhitespace(s string) string {
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
