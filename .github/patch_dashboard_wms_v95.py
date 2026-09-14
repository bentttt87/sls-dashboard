from pathlib import Path
import re

p = Path('index.html')
s = p.read_text(encoding='utf-8')

# 1) Dashboard auth must use the canonical shared WMS access model.
s = s.replace("const access = await sbRpc('breakage_my_access_v44', {});", "const access = await sbRpc('wms_my_access', {});")
if "sbRpc('wms_my_access'" not in s:
    raise SystemExit('wms_my_access anchor not found')

# 2) Normalize role gate/scope. Only MASTER, MANAGEMENT and SUPERVISOR may enter Dashboard.
old_scope = "CURRENT_RDC_SCOPE = access.is_master ? null : access.rdc_name;"
new_scope = "CURRENT_RDC_SCOPE = ['master','management'].includes(CURRENT_ROLE) ? null : access.rdc_name;"
if old_scope in s:
    s = s.replace(old_scope, new_scope, 1)
elif new_scope not in s:
    raise SystemExit('CURRENT_RDC_SCOPE anchor not found')

role_line = 'CURRENT_ROLE = access.role;'
role_gate = """CURRENT_ROLE = access.role;
    if(!['master','management','supervisor'].includes(CURRENT_ROLE)){
      errEl.textContent='Akun ini tidak memiliki akses Dashboard SLS.';
      AUTH_SESSION=null; AUTH_SESSION_OK=false; CURRENT_PASSWORD='';
      return;
    }"""
if role_gate not in s:
    if role_line not in s:
        raise SystemExit('CURRENT_ROLE anchor not found')
    s = s.replace(role_line, role_gate, 1)

# 3) Ensure current role/branding patch and WMS live bridge are actually loaded by index.html.
# Remove old duplicate loader tags first, then append one authoritative pair before </body>.
s = re.sub(r'\s*<script\s+src=["\']ecosystem_v72\.js\?v=[^"\']+["\']></script>\s*', '\n', s)
s = re.sub(r'\s*<script\s+src=["\']wms_integration_v94\.js\?v=[^"\']+["\']></script>\s*', '\n', s)
tags = '\n<script src="ecosystem_v72.js?v=20260914a"></script>\n<script src="wms_integration_v94.js?v=20260914a"></script>\n'
if '</body>' in s:
    s = s.replace('</body>', tags + '</body>', 1)
elif '</html>' in s:
    s = s.replace('</html>', tags + '</html>', 1)
else:
    s += tags

# 4) Static assertions.
assert s.count('wms_integration_v94.js?v=20260914a') == 1
assert s.count('ecosystem_v72.js?v=20260914a') == 1
assert "sbRpc('wms_my_access'" in s
assert "['master','management','supervisor'].includes(CURRENT_ROLE)" in s
assert "['master','management'].includes(CURRENT_ROLE) ? null : access.rdc_name" in s

p.write_text(s, encoding='utf-8')
print('Dashboard index patched for WMS v95 bridge')
