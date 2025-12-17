package sectigo

import (
	"errors"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"

	httpapi "my-tools/internal/api/http"
	"my-tools/internal/infra/execx"
)

func Register(r *gin.RouterGroup) {
	runner := execx.NewRunner()
	svc := NewService(runner)

	g := r.Group("/sectigo")
	g.POST("/detail", func(c *gin.Context) {
		var req RunRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, httpapi.Fail("bad_request", err.Error()))
			return
		}

		res, err := svc.Detail(c.Request.Context(), req.Text)
		// 即使 sectigoTool 执行失败（exitCode 非 0），也把 stdout/stderr/exitCode 返回给前端，方便排查。
		_ = err
		c.JSON(http.StatusOK, httpapi.OK(toRunResponse(res)))
	})

	g.POST("/refund", func(c *gin.Context) {
		var req RunRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, httpapi.Fail("bad_request", err.Error()))
			return
		}

		res, err := svc.Refund(c.Request.Context(), req.Text)
		_ = err
		c.JSON(http.StatusOK, httpapi.OK(toRunResponse(res)))
	})

	runs := r.Group("/runs")
	runs.GET("/file", func(c *gin.Context) {
		runID := c.Query("runId")
		name := c.Query("name")
		if runID == "" || name == "" {
			c.JSON(http.StatusBadRequest, httpapi.Fail("bad_request", "runId and name are required"))
			return
		}

		if strings.Contains(runID, "..") || strings.Contains(name, "..") {
			c.JSON(http.StatusBadRequest, httpapi.Fail("bad_request", "invalid path"))
			return
		}
		if strings.ContainsAny(runID, "\\") || strings.ContainsAny(name, "\\") {
			c.JSON(http.StatusBadRequest, httpapi.Fail("bad_request", "invalid path"))
			return
		}
		if filepath.IsAbs(runID) || filepath.IsAbs(name) {
			c.JSON(http.StatusBadRequest, httpapi.Fail("bad_request", "invalid path"))
			return
		}

		p := filepath.Join(runner.BaseDir, filepath.FromSlash(runID), name)
		st, err := os.Stat(p)
		if err != nil {
			if errors.Is(err, os.ErrNotExist) {
				c.JSON(http.StatusNotFound, httpapi.Fail("not_found", "file not found"))
				return
			}
			c.JSON(http.StatusInternalServerError, httpapi.Fail("internal", err.Error()))
			return
		}
		if st.IsDir() {
			c.JSON(http.StatusBadRequest, httpapi.Fail("bad_request", "not a file"))
			return
		}

		c.Header("Content-Disposition", "attachment; filename=\""+name+"\"")
		c.File(p)
	})
}

func toRunResponse(res *execx.Result) RunResponse {
	out := RunResponse{}
	if res == nil {
		return out
	}
	out.RunID = res.RunID
	out.Stdout = res.Stdout
	out.Stderr = res.Stderr
	out.ExitCode = res.ExitCode
	out.Files = make([]RunFileEntry, 0, len(res.Files))
	for _, f := range res.Files {
		out.Files = append(out.Files, RunFileEntry{Name: f.Name, Size: f.Size})
	}
	return out
}
