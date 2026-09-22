"""Build three standalone offline HTML pages; Python 3, standard library only."""
from pathlib import Path
import re
root=Path(__file__).resolve().parent;src=root/'src';dest=root/'docs';dest.mkdir(exist_ok=True)
r=src/'ribosome_web';three=(r/'vendor/three.min.js').read_text();data=(r/'data/model.json').read_text();base=(r/'app.js').read_text();cartoon=(r/'cartoon.js').read_text()
shaders=re.search(r'const vertex=`.*?const fragment=`.*?`;',base,re.S).group()
for folder,template,output in [('ribosome_web','template.html','structure.html'),('translation_web','index.template.html','translation.html'),('biogenesis_web','template.html','biogenesis.html')]:
 p=src/folder;app=(p/'app.js').read_text().replace('/*__CARTOON__*/',cartoon).replace('/*__SPHERE_SHADERS__*/',shaders)
 if folder=='biogenesis_web':app=app.replace('/*__ENVIRONMENT__*/',(p/'environment.js').read_text())
 s=(p/template).read_text().replace('/*__THREE__*/',three).replace('__DATA__',(p/'data/model.json').read_text() if folder=='biogenesis_web' else data).replace('/*__APP__*/',app)
 if folder=='translation_web':s=s.replace('__COMPLEX__',(p/'data/complex.json').read_text())
 (dest/output).write_text(s);print(output)
