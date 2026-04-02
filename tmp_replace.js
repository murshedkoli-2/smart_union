const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      let orig = content;
      
      // We only replace exact strings for roles:
      content = content.replace(/'super_admin'/g, "'secretary'");
      content = content.replace(/"super_admin"/g, "\"secretary\"");
      content = content.replace(/ROLES\.SUPER_ADMIN/g, "ROLES.SECRETARY");

      content = content.replace(/'admin'/g, "'entrepreneur'");
      content = content.replace(/"admin"/g, "\"entrepreneur\"");
      content = content.replace(/ROLES\.ADMIN/g, "ROLES.ENTREPRENEUR");

      // For user, it's risky. Let's only replace when used in authorize or enum arrays or db checks
      content = content.replace(/\['super_admin', 'admin', 'user'\]/g, "['secretary', 'entrepreneur', 'citizen']");
      content = content.replace(/\['super_admin', 'admin'\]/g, "['secretary', 'entrepreneur']");
      content = content.replace(/\['secretary', 'entrepreneur', 'user'\]/g, "['secretary', 'entrepreneur', 'citizen']");
      
      content = content.replace(/actor\.role === 'user'/g, "actor.role === 'citizen'");
      content = content.replace(/actor\.role !== 'user'/g, "actor.role !== 'citizen'");
      content = content.replace(/user\.role === 'user'/g, "user.role === 'citizen'");
      content = content.replace(/user\.role !== 'user'/g, "user.role !== 'citizen'");
      content = content.replace(/enum: \['secretary', 'entrepreneur', 'user'\]/g, "enum: ['secretary', 'entrepreneur', 'citizen']");
      content = content.replace(/enum: \['super_admin', 'admin', 'user'\]/g, "enum: ['secretary', 'entrepreneur', 'citizen']");
      content = content.replace(/ROLES\.USER/g, "ROLES.CITIZEN");

      // Any missing single quote 'user' -> 'citizen' in schemas?
      content = content.replace(/default: 'user'/g, "default: 'citizen'");

      if (content !== orig) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log('Updated', fullPath);
      }
    }
  }
}

processDir(path.join(process.cwd(), 'src'));
