package utils

import (
	"errors"
	"fmt"
	"net"
	"regexp"
	"strings"

	"github.com/weppos/publicsuffix-go/publicsuffix"
	"golang.org/x/net/idna"
)

// VerifyDomain doc
func VerifyDomain(d string) (domain string, isIP bool, err error) {
	domain = strings.TrimSpace(d)

	if domain == "" {
		err = errors.New("domain is empty")
		return
	}

	// 是否是IP
	isIP = net.ParseIP(domain) != nil

	if isIP {
		return domain, isIP, nil
	}

	var punyDm string
	punyDm, err = idna.ToASCII(domain)
	if err != nil {
		err = fmt.Errorf("checkDomainInfo.ToASCII domian(%s) failed", domain)
		return
	}

	// 判断域名是否合法
	if !ValidateDomain2(punyDm) {
		err = fmt.Errorf("domian(%s) is invalid", domain)
		return
	}

	return
}

var regDomain2 = regexp.MustCompile(`^[\w-_]{1,63}$`)

// ValidateDomain2 新版验证域名
func ValidateDomain2(d string) bool {
	// 通配符验证
	if strings.HasPrefix(d, "*.") {
		d = strings.TrimPrefix(d, "*.")
	}

	if !ValidateDomain(d) {
		return false
	}

	// 最大长度为 255
	if len(d) > 255 || len(d) < 3 {
		return false
	}
	// test.hello.example.com
	// DomainName{"com", "example", "test.hello"}
	// TLD SLD TRD
	dn, err := publicsuffix.Parse(d)
	if err != nil {
		return false
	}
	if !regDomain2.MatchString(dn.SLD) ||
		strings.HasPrefix(dn.SLD, "-") ||
		strings.HasSuffix(dn.SLD, "-") {
		return false
	}
	if dn.TRD != "" {
		for _, v := range strings.Split(dn.TRD, ".") {
			if !regDomain2.MatchString(v) ||
				strings.HasPrefix(v, "-") ||
				strings.HasSuffix(v, "-") {
				return false
			}
		}
	}
	return true
}

// var regexDomain = regexp.MustCompile(`^(\*\.)?([A-Za-z0-9_\-一-龥]{1,63}\.)*([A-Za-z0-9_\-一-龥]{1,256}\.[A-Za-z一-龥]{1,256})$`)
// 原始 `^[0-9\p{L}][0-9\p{L}-\.]{1,61}[0-9\p{L}]\.[0-9\p{L}][\p{L}-]*[0-9\p{L}]+$`
// 开放下划线 _
var regDomain = regexp.MustCompile(`^[0-9\p{L}][0-9\p{L}-\.]{0,250}\.[0-9\p{L}][\p{L}-]*[0-9\p{L}]+$`)

// ValidateDomain doc
func ValidateDomain(d string) bool {
	return regDomain.MatchString(d)
}
