#!/usr/bin/env bash
# Instala o backup do pedigree neste PC (RO-03, RO-04, RO-10 em docs/requisitos.md).
#
#   ./instalar.sh          1º passo: chaves, ~/.ssh/config e os comandos para rodar na VPS
#   ./instalar.sh ativar   2º passo (depois da VPS): instala o timer e faz a 1ª cópia
set -euo pipefail
AQUI="$(cd "$(dirname "$0")" && pwd)"
CONF="$HOME/.config/pedigree-backup"
CHAVE_AGE="$CONF/chave-age.txt"
CHAVE_SSH="$HOME/.ssh/pedigree-backup"
VPS_IP="164.152.47.212"

if [ "${1:-}" = "ativar" ]; then
    mkdir -p "$HOME/.local/share/pedigree-backup" "$HOME/.config/systemd/user"
    install -m 755 "$AQUI/puxar_backups.py" "$HOME/.local/share/pedigree-backup/"
    install -m 644 "$AQUI/pedigree-backup.service" "$AQUI/pedigree-backup.timer" "$HOME/.config/systemd/user/"
    systemctl --user daemon-reload
    systemctl --user enable --now pedigree-backup.timer
    echo "Primeira cópia:"
    python3 "$HOME/.local/share/pedigree-backup/puxar_backups.py" && echo "OK"
    systemctl --user list-timers pedigree-backup.timer --no-pager
    exit 0
fi

command -v age-keygen > /dev/null || { echo "Instale o age: sudo dnf install age"; exit 1; }
mkdir -p "$CONF" && chmod 700 "$CONF"

if [ ! -f "$CHAVE_AGE" ]; then
    (umask 077 && age-keygen -o "$CHAVE_AGE" 2> /dev/null)
    echo "Chave age criada em $CHAVE_AGE"
fi
chmod 600 "$CHAVE_AGE"

if [ ! -f "$CHAVE_SSH" ]; then
    # Sem senha: o timer precisa usar sozinho. Na VPS ela só lê a pasta de backups cifrados.
    ssh-keygen -q -t ed25519 -N "" -C "pedigree-backup (somente leitura dos backups)" -f "$CHAVE_SSH"
fi

if ! grep -qs "^Host pedigree-backup$" "$HOME/.ssh/config"; then
    cat >> "$HOME/.ssh/config" <<CFG

Host pedigree-backup
    HostName $VPS_IP
    User ubuntu
    IdentityFile $CHAVE_SSH
    IdentitiesOnly yes
CFG
    chmod 600 "$HOME/.ssh/config"
fi

PUB_AGE="$(age-keygen -y "$CHAVE_AGE")"
PUB_SSH="$(cat "$CHAVE_SSH.pub")"
cat <<TXT

================ 1. COPIE A CHAVE PRIVADA PARA O PAPEL E PARA O PENDRIVE ================
Sem ela, os backups cifrados NÃO podem ser abertos. Guarde longe do PC.

$(grep '^AGE-SECRET-KEY' "$CHAVE_AGE")

Pendrive:  cp "$CHAVE_AGE" /run/media/\$USER/<PENDRIVE>/pedigree-chave-age.txt

================ 2a. AQUI NO PC: envia o script novo para a VPS ================
# Vai com outro nome (backup-externo.sh): a VPS segue na main e o git dela não vê este
# arquivo. No merge final da dev, o cron volta para o backup.sh (docs/operacao.md).
scp -o IdentitiesOnly=yes -i ~/.ssh/oracle-pedigree.key "$(dirname "$AQUI")/deploy/backup.sh" ubuntu@$VPS_IP:pedigree/deploy/backup-externo.sh

================ 2b. RODE NA VPS (ssh -o IdentitiesOnly=yes -i ~/.ssh/oracle-pedigree.key ubuntu@$VPS_IP) ================
sudo apt-get install -y age rsync
ls -l /usr/bin/rrsync        # precisa existir (vem com o rsync no Ubuntu 24.04)
echo '$PUB_AGE' > ~/pedigree/deploy/backup.pub
mkdir -p ~/pedigree/deploy/backups/externo
echo 'command="/usr/bin/rrsync -ro /home/ubuntu/pedigree/deploy/backups/externo",restrict $PUB_SSH' >> ~/.ssh/authorized_keys
chmod +x ~/pedigree/deploy/backup-externo.sh
crontab -l | sed 's#deploy/backup.sh #deploy/backup-externo.sh #' | crontab -
crontab -l
cd ~/pedigree/deploy && ./backup-externo.sh && ls -l backups/externo

================ 3. DE VOLTA AQUI NO PC ================
ssh pedigree-backup              # deve RECUSAR shell (é o esperado)
./instalar.sh ativar
TXT
