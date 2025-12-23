package json

import domainjson "my-tools/internal/domain/json"

type Service struct{}

func NewService() *Service {
	return &Service{}
}

func (s *Service) FormatJSON(input string, indent int) (string, error) {
	if indent <= 0 {
		indent = 2
	}
	return domainjson.FormatJSON(input, indent)
}

func (s *Service) MinifyJSON(input string) (string, error) {
	return domainjson.MinifyJSON(input)
}
