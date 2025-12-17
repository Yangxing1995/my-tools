package csr

import domaincsr "my-tools/internal/domain/csr"

type Service struct{}

func NewService() *Service {
	return &Service{}
}

func (s *Service) FormatCSR(input string) (string, error) {
	return domaincsr.NormalizeCSRPEM(input)
}
