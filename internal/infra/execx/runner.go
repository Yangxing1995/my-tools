package execx

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

type FileInfo struct {
	Name string `json:"name"`
	Size int64  `json:"size"`
}

type Result struct {
	RunID    string     `json:"runId"`
	Dir      string     `json:"-"`
	Stdout   string     `json:"stdout"`
	Stderr   string     `json:"stderr"`
	ExitCode int        `json:"exitCode"`
	Files    []FileInfo `json:"files"`
}

type Runner struct {
	BaseDir       string
	SectigoBinary string
	MaxOutput     int64
}

func NewRunner() *Runner {
	bin := filepath.Join("bin", "sectigoTool")
	return &Runner{
		BaseDir:       filepath.Join("work"),
		SectigoBinary: bin,
		MaxOutput:     2 << 20,
	}
}

func (r *Runner) RunSectigoDetail(ctx context.Context, inputText string) (*Result, error) {
	return r.runSectigo(ctx, "detail", inputText)
}

func (r *Runner) RunSectigoRefund(ctx context.Context, inputText string) (*Result, error) {
	return r.runSectigo(ctx, "refund", inputText)
}

func (r *Runner) runSectigo(ctx context.Context, op string, inputText string) (*Result, error) {
	if op != "detail" && op != "refund" {
		return nil, errors.New("invalid op")
	}
	if strings.TrimSpace(inputText) == "" {
		return nil, errors.New("input is empty")
	}

	if r.BaseDir == "" {
		return nil, errors.New("BaseDir is empty")
	}
	if err := os.MkdirAll(r.BaseDir, 0o755); err != nil {
		return nil, err
	}
	if r.SectigoBinary == "" {
		return nil, errors.New("SectigoBinary is empty")
	}
	st, err := os.Stat(r.SectigoBinary)
	if err != nil {
		return nil, fmt.Errorf("sectigoTool not found: %w", err)
	}
	if st.IsDir() {
		return nil, errors.New("sectigoTool path is a directory")
	}

	ts := time.Now().Format("20060102-150405")
	runID := filepath.ToSlash(filepath.Join("sectigo", op, ts))
	runDir := filepath.Join(r.BaseDir, filepath.FromSlash(runID))
	if err := os.MkdirAll(runDir, 0o755); err != nil {
		return nil, err
	}

	inputName := fmt.Sprintf("%s-%s.txt", op, ts)
	inputPath := filepath.Join(runDir, inputName)
	if err := os.WriteFile(inputPath, []byte(inputText), 0o644); err != nil {
		return nil, err
	}

	args := []string{}
	switch op {
	case "detail":
		args = []string{"--detail", inputName}
	case "refund":
		args = []string{"--refund", inputName}
	}

	stdoutBuf := &bytes.Buffer{}
	stderrBuf := &bytes.Buffer{}
	stdoutW := io.Writer(stdoutBuf)
	stderrW := io.Writer(stderrBuf)
	if r.MaxOutput > 0 {
		stdoutW = &limitedWriter{W: stdoutBuf, N: r.MaxOutput}
		stderrW = &limitedWriter{W: stderrBuf, N: r.MaxOutput}
	}

	cmd := exec.CommandContext(ctx, r.SectigoBinary, args...)
	cmd.Dir = runDir
	cmd.Stdout = stdoutW
	cmd.Stderr = stderrW

	err = cmd.Run()
	exitCode := 0
	if err != nil {
		var ee *exec.ExitError
		if errors.As(err, &ee) {
			exitCode = ee.ExitCode()
		} else {
			exitCode = -1
		}
	}

	files, ferr := listFiles(runDir)
	if ferr != nil {
		return nil, ferr
	}

	res := &Result{
		RunID:    runID,
		Dir:      runDir,
		Stdout:   stdoutBuf.String(),
		Stderr:   stderrBuf.String(),
		ExitCode: exitCode,
		Files:    files,
	}

	if err != nil {
		return res, err
	}
	return res, nil
}

type limitedWriter struct {
	W io.Writer
	N int64
}

func (l *limitedWriter) Write(p []byte) (int, error) {
	if l.N <= 0 {
		return 0, nil
	}
	if int64(len(p)) > l.N {
		p = p[:l.N]
	}
	n, err := l.W.Write(p)
	l.N -= int64(n)
	return n, err
}

func listFiles(dir string) ([]FileInfo, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, err
	}
	out := make([]FileInfo, 0, len(entries))
	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		info, err := e.Info()
		if err != nil {
			return nil, err
		}
		out = append(out, FileInfo{Name: e.Name(), Size: info.Size()})
	}
	return out, nil
}
