package csr

import (
	"strings"
	"testing"
)

func TestNormalizeCSRPEM(t *testing.T) {
	t.Parallel()

	const body = "MIIDCDCCAfACAQAwgZwxCzAJBgNVBAYTAkNOMRUwEwYDVQQIEwxTaGFuZ2hhaSBz"

	tests := []struct {
		name    string
		in      string
		wantHas []string
		wantErr bool
	}{
		{
			name:    "empty",
			in:      "",
			wantErr: true,
		},
		{
			name:    "escaped_crlf_with_headers",
			in:      pemHeader + "\\r\\n" + body + "\\r\\n" + pemFooter + "\\r\\n",
			wantHas: []string{pemHeader + "\n", body + "\n", pemFooter + "\n"},
		},
		{
			name:    "real_crlf_with_headers",
			in:      pemHeader + "\r\n" + body + "\r\n" + pemFooter + "\r\n",
			wantHas: []string{pemHeader + "\n", body + "\n", pemFooter + "\n"},
		},
		{
			name:    "no_headers_with_escaped_newlines",
			in:      body + "\\n" + "AAAA",
			wantHas: []string{pemHeader + "\n", body + "AAAA" + "\n", pemFooter + "\n"},
		},
	}

	for _, tt := range tests {
		tt := tt
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			got, err := NormalizeCSRPEM(tt.in)
			if tt.wantErr {
				if err == nil {
					t.Fatalf("expected error, got nil")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			for _, sub := range tt.wantHas {
				if !strings.Contains(got, sub) {
					t.Fatalf("output does not contain %q\noutput: %q", sub, got)
				}
			}
		})
	}
}
