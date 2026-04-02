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

      // Fix missing permissions or purely 'secretary' gates:
      
      content = content.replace(/authorize\(\['secretary'\]\)\(postHandler\)/g, function(a, b, c) {
        if (fullPath.includes('certificates')) return "authorize(['secretary', 'entrepreneur'], 'certificate.approve')(postHandler)";
        if (fullPath.includes('warish')) return "authorize(['secretary', 'entrepreneur'], 'warish.approve')(postHandler)";
        if (fullPath.includes('relief')) return "authorize(['secretary', 'entrepreneur'], 'relief.manage')(postHandler)";
        if (fullPath.includes('users')) return "authorize(['secretary', 'entrepreneur'], 'user.manage')(postHandler)";
        return a;
      });

      content = content.replace(/authorize\(\['secretary'\]\)\((patchHandler|getHandler)\)/g, function(a, handler) {
        if (fullPath.includes('system-settings')) return `authorize(['secretary', 'entrepreneur'], 'settings.manage')(${handler})`;
        if (fullPath.includes('audit-logs')) return `authorize(['secretary', 'entrepreneur'], 'audit.view')(${handler})`;
        if (fullPath.includes('users')) return `authorize(['secretary', 'entrepreneur'], 'user.manage')(${handler})`;
        return a;
      });
      
      // Now ensure that ALL routes that have `authorize(['secretary', 'entrepreneur'])` without permissions get the proper one!
      content = content.replace(/authorize\(\['secretary', 'entrepreneur'\]\)\((.*?)\)/g, function(a, handler) {
        if (fullPath.includes('cert-templates')) return `authorize(['secretary', 'entrepreneur'], 'template.manage')(${handler})`;
        if (fullPath.includes('citizens')) {
            if (handler === 'getHandler') return `authorize(['secretary', 'entrepreneur'], 'citizen.view')(${handler})`;
            if (handler === 'postHandler') return `authorize(['secretary', 'entrepreneur'], 'citizen.create')(${handler})`;
            if (handler === 'patchHandler') return `authorize(['secretary', 'entrepreneur'], 'citizen.edit')(${handler})`;
        }
        if (fullPath.includes('certificates')) {
            if (handler === 'getHandler') return `authorize(['secretary', 'entrepreneur'], 'certificate.view')(${handler})`;
            if (handler === 'postHandler') return `authorize(['secretary', 'entrepreneur'], 'certificate.create')(${handler})`;
            if (handler === 'patchHandler') return `authorize(['secretary', 'entrepreneur'], 'certificate.approve')(${handler})`;
        }
        if (fullPath.includes('warish')) {
            if (handler === 'getHandler') return `authorize(['secretary', 'entrepreneur'], 'warish.view')(${handler})`;
            if (handler === 'postHandler' || handler === 'patchHandler') return `authorize(['secretary', 'entrepreneur'], 'warish.create')(${handler})`; 
        }
        if (fullPath.includes('tax')) {
            if (handler === 'getHandler') return `authorize(['secretary', 'entrepreneur'], 'tax.view')(${handler})`;
            if (handler === 'postHandler' || handler === 'patchHandler') return `authorize(['secretary', 'entrepreneur'], 'tax.create')(${handler})`;
        }
        if (fullPath.includes('payments')) {
            if (handler === 'getHandler') return `authorize(['secretary', 'entrepreneur'], 'payment.view')(${handler})`;
        }
        if (fullPath.includes('cashbook')) {
            if (handler === 'getHandler') return `authorize(['secretary', 'entrepreneur'], 'cashbook.view')(${handler})`;
        }
        if (fullPath.includes('relief')) {
            if (handler === 'getHandler') return `authorize(['secretary', 'entrepreneur'], 'relief.view')(${handler})`;
            if (handler === 'postHandler' || handler === 'patchHandler' || handler === 'deleteHandler') return `authorize(['secretary', 'entrepreneur'], 'relief.manage')(${handler})`;
        }
        if (fullPath.includes('system-settings')) {
            if (handler === 'getHandler') return `authorize(['secretary', 'entrepreneur'], 'settings.view')(${handler})`;
        }
        if (fullPath.includes('dashboard')) {
            // Dashboard can be viewed by all authenticated. No granular permissions.
            return a;
        }
        
        return a;
      });

      if (content !== orig) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log('Updated permissions for', fullPath);
      }
    }
  }
}

processDir(path.join(process.cwd(), 'src/app/api'));
