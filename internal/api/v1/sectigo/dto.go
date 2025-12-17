package sectigo

type RunRequest struct {
	Text string `json:"text" binding:"required"`
}

type RunResponse struct {
	RunID    string         `json:"runId"`
	Stdout   string         `json:"stdout"`
	Stderr   string         `json:"stderr"`
	ExitCode int            `json:"exitCode"`
	Files    []RunFileEntry `json:"files"`
}

type RunFileEntry struct {
	Name string `json:"name"`
	Size int64  `json:"size"`
}
