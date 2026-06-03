package csr

import domaincsr "my-tools/internal/domain/csr"

type Service struct{}

func NewService() *Service {
	return &Service{}
}

func (s *Service) FormatCSR(input string) (string, error) {
	return domaincsr.NormalizeCSRPEM(input)
}

func (s *Service) ParseCSR(input string) (ParseCSRResponse, error) {
	info, err := domaincsr.ParseCSR(input)
	if err != nil {
		return ParseCSRResponse{}, err
	}

	return ParseCSRResponse{
		PEM:                info.PEM,
		Subject:            info.Subject,
		CommonName:         info.CommonName,
		Country:            info.Country,
		Organization:       info.Organization,
		OrganizationalUnit: info.OrganizationalUnit,
		Locality:           info.Locality,
		Province:           info.Province,
		DNSNames:           info.DNSNames,
		EmailAddresses:     info.EmailAddresses,
		IPAddresses:        info.IPAddresses,
		URIs:               info.URIs,
		PublicKeyAlgorithm: info.PublicKeyAlgorithm,
		PublicKeySize:      info.PublicKeySize,
		SignatureAlgorithm: info.SignatureAlgorithm,
	}, nil
}
