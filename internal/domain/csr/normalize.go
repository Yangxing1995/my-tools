package csr

import (
	"errors"
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
