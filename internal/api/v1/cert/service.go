package cert

import domaincert "my-tools/internal/domain/cert"

type Service struct{}

func NewService() *Service {
	return &Service{}
}

func (s *Service) SplitCertChain(input string) ([]string, error) {
	return domaincert.SplitCertChain(input)
}

func (s *Service) SplitCertChainWithInfo(input string) ([]CertDetail, error) {
	certInfos, err := domaincert.SplitCertChainWithInfo(input)
	if err != nil {
		return nil, err
	}

	result := make([]CertDetail, len(certInfos))
	for i, info := range certInfos {
		result[i] = CertDetail{
			PEM:          info.PEM,
			Subject:      info.Subject,
			Issuer:       info.Issuer,
			NotBefore:    info.NotBefore,
			NotAfter:     info.NotAfter,
			SerialNumber: info.SerialNumber,
			Version:      info.Version,
			IsCA:         info.IsCA,
		}
	}
	return result, nil
}
