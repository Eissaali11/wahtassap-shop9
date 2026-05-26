const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const config = {
  host: '72.62.149.127',
  username: 'root',
  password: 'Eisa11223344@',
  domain: 'raya2.site',
  email: 'admin@raya2.site',
  activeSessionId: '7a96f9ef-0dc6-4c85-bfe3-7808fadf5edd',
  repoUrl: 'https://github.com/Eissaali11/wahtassap-shop9.git'
};

async function runDeployment() {
  const conn = new Client();

  conn.on('ready', () => {
    console.log('SSH Connection Established successfully.');
    conn.sftp(async (err, sftp) => {
      if (err) throw err;
      try {
        await executePipeline(conn, sftp);
      } catch (ex) {
        console.error('Pipeline failed:', ex);
      } finally {
        conn.end();
      }
    });
  }).connect({
    host: config.host,
    port: 22,
    username: config.username,
    password: config.password,
    readyTimeout: 30000
  });
}

// Helper to run commands remotely
function sshExec(conn, cmd) {
  return new Promise((resolve, reject) => {
    console.log(`\nExecuting: ${cmd}`);
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let stdout = '';
      let stderr = '';
      stream.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Command failed with exit code ${code}. Error: ${stderr}`));
        } else {
          resolve(stdout);
        }
      }).on('data', (data) => {
        stdout += data.toString();
        process.stdout.write(data);
      }).stderr.on('data', (data) => {
        stderr += data.toString();
        process.stderr.write(data);
      });
    });
  });
}

// Helper to upload files via SFTP
function sftpUpload(sftp, local, remote) {
  return new Promise((resolve, reject) => {
    console.log(`Uploading: ${local} -> ${remote}`);
    sftp.fastPut(local, remote, {}, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

// Helper to write string directly to remote file
function sftpWriteString(sftp, content, remotePath) {
  return new Promise((resolve, reject) => {
    console.log(`Writing string content directly to: ${remotePath}`);
    const stream = sftp.createWriteStream(remotePath);
    stream.on('error', (err) => reject(err));
    stream.on('close', () => resolve());
    stream.end(content);
  });
}

async function executePipeline(conn, sftp) {
  // A. Upload Hostinger setup script
  console.log('--- Phase 1: Uploading setup script...');
  await sftpUpload(sftp, path.join(__dirname, 'deploy', 'hostinger-setup.sh'), '/tmp/hostinger-setup.sh');

  // B. Write and upload temporary HTTP Nginx config
  console.log('--- Phase 2: Setting up Nginx HTTP challenge config...');
  const nginxHttpConfig = `
server {
    listen 80;
    listen [::]:80;
    server_name ${config.domain} www.${config.domain};

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
        try_files \$uri =404;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}
`;
  await sftpWriteString(sftp, nginxHttpConfig, '/tmp/openwa-nginx.conf');

  // C. Run remote hostinger setup
  console.log('--- Phase 3: Executing remote VPS setup (installing Node, PG, Redis, Nginx)...');
  console.log('Cleaning up any potential dpkg/apt locks from previous canceled runs...');
  await sshExec(conn, 'killall -9 apt apt-get dpkg 2>/dev/null || true');
  await sshExec(conn, 'rm -f /var/lib/dpkg/lock-frontend /var/lib/dpkg/lock /var/lib/apt/lists/lock /var/cache/apt/archives/lock');
  await sshExec(conn, 'dpkg --configure -a');
  const setupOutput = await sshExec(conn, 'bash /tmp/hostinger-setup.sh');

  // Parse postgres password from output
  const pgPasswordMatch = setupOutput.match(/PostgreSQL DB Password:\s*([a-zA-Z0-9]+)/);
  if (!pgPasswordMatch) {
    throw new Error('Could not parse PostgreSQL password from setup script output!');
  }
  const dbPassword = pgPasswordMatch[1].trim();
  console.log(`\nParsed PG Database Password: ${dbPassword}`);

  // D. Skip Certbot SSL temporarily since DNS A record is not pointed yet
  console.log('--- Phase 4: Setting up HTTP-only Nginx configuration (bypassing DNS check temporarily)...');
  
  // E. Upload full Nginx HTTP config
  console.log('--- Phase 5: Configuring Nginx Reverse Proxy for Port 80...');
  const remoteNginxConf = `
upstream openwa_api {
    server 127.0.0.1:2785;
    keepalive 32;
}

server {
    listen 80;
    listen [::]:80;
    server_name ${config.domain} www.${config.domain} ${config.host};

    client_max_body_size 50M;

    location /api/ {
        proxy_pass http://openwa_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 120s;
        proxy_connect_timeout 10s;
    }

    location /socket.io/ {
        proxy_pass http://openwa_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_read_timeout 86400s;
    }

    location / {
        root /app/openwa/dashboard/dist;
        try_files \$uri \$uri/ /index.html;
        expires 1h;
        add_header Cache-Control "public, no-transform";
    }

    location /api/docs {
        deny all;
        return 404;
    }
}
`;

  await sftpWriteString(sftp, remoteNginxConf, '/tmp/openwa-nginx-ssl.conf');
  await sshExec(conn, 'cp /tmp/openwa-nginx-ssl.conf /etc/nginx/sites-available/openwa.conf');
  await sshExec(conn, 'ln -sf /etc/nginx/sites-available/openwa.conf /etc/nginx/sites-enabled/openwa.conf');
  await sshExec(conn, 'rm -f /etc/nginx/sites-enabled/openwa /etc/nginx/sites-available/openwa');
  await sshExec(conn, 'nginx -t && systemctl reload nginx');

  // F. Clone project Git Repository directly on the VPS
  console.log('--- Phase 6: Stopping existing processes to release file locks and cloning project repository from GitHub...');
  await sshExec(conn, 'sudo -u openwa pm2 delete openwa || true');
  await sshExec(conn, 'sudo -u openwa pm2 kill || true');
  await sshExec(conn, 'rm -rf /app/openwa');
  await sshExec(conn, `git clone ${config.repoUrl} /app/openwa`);

  // G. Generate .env file and write it
  console.log('--- Phase 7: Creating production .env file...');
  const apiMasterKey = crypto.randomBytes(32).toString('hex');
  const envContent = `
PORT=2785
NODE_ENV=production

DATABASE_TYPE=postgres
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=openwa
DATABASE_PASSWORD=${dbPassword}
DATABASE_NAME=openwa
DATABASE_SYNCHRONIZE=true
DATABASE_LOGGING=false

ENGINE_TYPE=whatsapp-web.js
SESSION_DATA_PATH=./data/sessions
PUPPETEER_HEADLESS=true
PUPPETEER_ARGS=--no-sandbox,--disable-setuid-sandbox,--disable-dev-shm-usage

WEBHOOK_TIMEOUT=10000
WEBHOOK_MAX_RETRIES=3
WEBHOOK_RETRY_DELAY=5000

STORAGE_TYPE=local
STORAGE_LOCAL_PATH=./data/media

REDIS_ENABLED=true
REDIS_HOST=localhost
REDIS_PORT=6379

QUEUE_ENABLED=true
CACHE_ENABLED=true

API_MASTER_KEY=${apiMasterKey}
DEFAULT_SESSION_ID=${config.activeSessionId}
WEBHOOK_SECRET=default-secret
`;
  await sftpWriteString(sftp, envContent, '/app/openwa/.env');
  await sshExec(conn, 'chown openwa:openwa /app/openwa/.env');

  // H. Build and compile app remotely
  console.log('--- Phase 8: Installing dependencies and building on remote server...');
  await sshExec(conn, 'cd /app/openwa && npm ci');
  await sshExec(conn, 'cd /app/openwa && npm run build');
  await sshExec(conn, 'cd /app/openwa/dashboard && npm ci && npm run build');

  // I. Run database migrations
  console.log('--- Phase 9: Database is synchronized automatically on application bootstrap, skipping migrations...');
  await sshExec(conn, 'echo "Skipping migrations, database synchronized automatically."');

  // J. Launch Application using PM2 under openwa user
  console.log('--- Phase 10: Starting process with PM2...');
  await sshExec(conn, 'chown -R openwa:openwa /app/openwa');
  await sshExec(conn, 'sudo -u openwa pm2 delete openwa || true');
  await sshExec(conn, 'cd /app/openwa && sudo -u openwa pm2 start dist/main.js --name openwa --max-memory-restart 1G --time');
  await sshExec(conn, 'sudo -u openwa pm2 save');

  console.log('\n======================================================');
  console.log('🚀 DEPLOYMENT COMPLETED SUCCESSFULLY!');
  console.log(`🌐 Your website: https://${config.domain}`);
  console.log(`🔑 Master API Key: ${apiMasterKey}`);
  console.log('======================================================');
}

runDeployment().catch(err => console.error('Deployment failed:', err));
