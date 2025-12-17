package sectigo

import (
	"context"

	"my-tools/internal/infra/execx"
)

type Service struct {
	runner *execx.Runner
}

func NewService(r *execx.Runner) *Service {
	return &Service{runner: r}
}

func (s *Service) Detail(ctx context.Context, text string) (*execx.Result, error) {
	return s.runner.RunSectigoDetail(ctx, text)
}

func (s *Service) Refund(ctx context.Context, text string) (*execx.Result, error) {
	return s.runner.RunSectigoRefund(ctx, text)
}
