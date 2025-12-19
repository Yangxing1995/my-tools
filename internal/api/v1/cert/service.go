package cert

import domaincert "my-tools/internal/domain/cert"

type Service struct{}

func NewService() *Service {
	return &Service{}
}

func (s *Service) SplitCertChain(input string) ([]string, error) {
	return domaincert.SplitCertChain(input)
}
