import sys,shutil
SRC=sys.argv[1]; API=open('/home/claude/value-shoots/derma/api.txt').read().strip() if __import__('os').path.exists('/home/claude/value-shoots/derma/api.txt') else ''
s=open(SRC).read()
s=s.replace('<title>Derma Finder</title>\n','',1).replace('<title>Derma Finder</title>','',1)
assert '</style></head>' in s
s=s.replace('</style></head>','</style><title>Derma Finder</title><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="Derma Finder"></head>',1)
a='<h1>Derma Finder <span id="cityName">Dubai</span></h1>'; assert a in s
s=s.replace(a,a+'<a href="../" style="color:var(--gold);text-decoration:none;font-size:12px">← Value Shoots</a>',1)
a="const moveBtn=()=>'';"
if a in s: s=s.replace(a,"var moveBtn=()=>'';")
i=s.rindex('</body>')
s=s[:i]+'<script>window.DERMA_API=%s;</script><script src="team.js?v=%d"></script>\n'%(__import__('json').dumps(API),int(__import__('time').time()))+s[i:]
open('/home/claude/value-shoots/derma/index.html','w').write(s)
shutil.copy('team.js','/home/claude/value-shoots/derma/team.js')
print('built, API set' if API else 'built, API empty')
