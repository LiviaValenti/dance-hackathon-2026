#!/usr/bin/env bash
# Pull the latest changes from each source repo into its folder (git subtree).
# Usage: ./sync.sh            -> sync all
#        ./sync.sh new-chapter -> sync one
set -euo pipefail
cd "$(dirname "$0")"

# folder | repo URL | branch
REPOS=(
  "poc-dance|https://github.com/MonikaLu/poc-dance.git|main"
  "use-case-2-research|https://github.com/LiviaValenti/use-case-2-research.git|main"
  "insured-gains|https://github.com/daudmohamed/insured-gains.git|main"
  "new-chapter|https://github.com/Yan-MX/new-chapter.git|master"
)

for entry in "${REPOS[@]}"; do
  IFS='|' read -r dir url branch <<<"$entry"
  [[ $# -gt 0 && "$1" != "$dir" ]] && continue
  if [[ -d "$dir" ]]; then
    echo "==> Pulling $dir from $url ($branch)"
    git subtree pull --prefix="$dir" "$url" "$branch" -m "Sync $dir from upstream"
  else
    echo "==> Adding $dir from $url ($branch)"
    git subtree add --prefix="$dir" "$url" "$branch" \
      || echo "!! Could not add $dir (repo private or missing?) - skipping"
  fi
done
