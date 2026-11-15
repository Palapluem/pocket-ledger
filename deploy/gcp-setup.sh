#!/usr/bin/env bash
# One-time GCP setup for PocketLedger (Lab 5). Review every command before running.
# Run in Cloud Shell (or with an authenticated gcloud) as the project owner:
#   PROJECT_ID=<your-project-id> SEED_FILE=./seed-users.json bash deploy/gcp-setup.sh
# SEED_FILE is a local, never-committed JSON array of {email, displayName, role, password}
# synthetic demo users. Generated passwords and secrets go straight into Secret Manager
# and are never printed.
#
# First-run only: the script stops before changing anything if the database user or any
# runtime secret already exists, so a rerun can never change the live SQL password or
# rotate the JWT key underneath a running revision. Rotation is a separate, coordinated
# operation (see "Credential rotation" in docs/labs/lab-05/deployment.md).
set -euo pipefail

: "${PROJECT_ID:?set PROJECT_ID}"
: "${SEED_FILE:?set SEED_FILE to a local JSON file of synthetic seed users}"
REGION=${REGION:-asia-southeast1}
REPO_SLUG=${REPO_SLUG:-Palapluem/pocket-ledger}
AR_REPO=pocket-ledger
SERVICE=pocket-ledger
SQL_INSTANCE=pocket-ledger-db
DB_NAME=pocket_ledger
DB_USER=pocket_ledger
RUNTIME_SA=pl-runtime
DEPLOY_SA=pl-deployer
POOL=github
PROVIDER=pocket-ledger

gcloud config set project "$PROJECT_ID"

echo "== Refusing to run over existing credentials"
existing=""
for secret in pl-database-url pl-jwt-secret pl-seed-users; do
  if gcloud secrets describe "$secret" >/dev/null 2>&1; then existing="$existing secret:$secret"; fi
done
if gcloud sql instances describe "$SQL_INSTANCE" >/dev/null 2>&1 &&
  gcloud sql users list --instance="$SQL_INSTANCE" --format='value(name)' | grep -qx "$DB_USER"; then
  existing="$existing sql-user:$DB_USER"
fi
if [ -n "$existing" ]; then
  echo "Already set up:$existing" >&2
  echo "Nothing was changed. This script is first-run only; rotate credentials with the documented procedure." >&2
  exit 1
fi

PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')

echo "== APIs"
gcloud services enable run.googleapis.com sqladmin.googleapis.com \
  artifactregistry.googleapis.com secretmanager.googleapis.com \
  iam.googleapis.com iamcredentials.googleapis.com sts.googleapis.com

echo "== Artifact Registry"
gcloud artifacts repositories create "$AR_REPO" --repository-format=docker \
  --location="$REGION" --description="PocketLedger images" || true

echo "== Cloud SQL PostgreSQL 18 (smallest shared-core tier; data persists outside containers)"
gcloud sql instances create "$SQL_INSTANCE" --database-version=POSTGRES_18 \
  --edition=ENTERPRISE --tier=db-f1-micro --region="$REGION" \
  --storage-size=10 --storage-auto-increase || true
gcloud sql databases create "$DB_NAME" --instance="$SQL_INSTANCE" || true
DB_PASSWORD=$(openssl rand -hex 24)
gcloud sql users create "$DB_USER" --instance="$SQL_INSTANCE" --password="$DB_PASSWORD"
CONNECTION_NAME=$(gcloud sql instances describe "$SQL_INSTANCE" --format='value(connectionName)')

echo "== Secrets (values are not printed)"
put_secret() {
  # Creates a new secret with its first version; fails if the secret already exists.
  gcloud secrets create "$1" --replication-policy=automatic --data-file=-
}
printf '%s' "postgresql://${DB_USER}:${DB_PASSWORD}@localhost/${DB_NAME}?host=/cloudsql/${CONNECTION_NAME}" | put_secret pl-database-url
openssl rand -hex 32 | tr -d '\n' | put_secret pl-jwt-secret
put_secret pl-seed-users < "$SEED_FILE"

echo "== Service accounts"
gcloud iam service-accounts create "$RUNTIME_SA" --display-name="PocketLedger runtime" || true
gcloud iam service-accounts create "$DEPLOY_SA" --display-name="PocketLedger GitHub deployer" || true
RUNTIME_EMAIL="${RUNTIME_SA}@${PROJECT_ID}.iam.gserviceaccount.com"
DEPLOY_EMAIL="${DEPLOY_SA}@${PROJECT_ID}.iam.gserviceaccount.com"
for role in roles/cloudsql.client roles/secretmanager.secretAccessor; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" --member="serviceAccount:${RUNTIME_EMAIL}" --role="$role" --condition=None >/dev/null
done
for role in roles/run.admin roles/artifactregistry.writer; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" --member="serviceAccount:${DEPLOY_EMAIL}" --role="$role" --condition=None >/dev/null
done
gcloud iam service-accounts add-iam-policy-binding "$RUNTIME_EMAIL" \
  --member="serviceAccount:${DEPLOY_EMAIL}" --role=roles/iam.serviceAccountUser >/dev/null

echo "== Workload Identity Federation (only ${REPO_SLUG} on refs/heads/main may deploy)"
gcloud iam workload-identity-pools create "$POOL" --location=global --display-name="GitHub" || true
gcloud iam workload-identity-pools providers create-oidc "$PROVIDER" --location=global \
  --workload-identity-pool="$POOL" --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref" \
  --attribute-condition="assertion.repository=='${REPO_SLUG}' && assertion.ref=='refs/heads/main'" || true
gcloud iam service-accounts add-iam-policy-binding "$DEPLOY_EMAIL" \
  --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL}/attribute.repository/${REPO_SLUG}" >/dev/null

cat <<EOF

== Done. Set these GitHub repository variables (Settings > Secrets and variables > Actions > Variables):
GCP_PROJECT_ID=${PROJECT_ID}
GCP_REGION=${REGION}
ARTIFACT_REPOSITORY=${AR_REPO}
CLOUD_RUN_SERVICE=${SERVICE}
CLOUD_SQL_CONNECTION_NAME=${CONNECTION_NAME}
GCP_RUNTIME_SERVICE_ACCOUNT=${RUNTIME_EMAIL}
GCP_DEPLOY_SERVICE_ACCOUNT=${DEPLOY_EMAIL}
GCP_WIF_PROVIDER=projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL}/providers/${PROVIDER}
PUBLIC_URL=<set after the first deploy: https://${SERVICE}-${PROJECT_NUMBER}.${REGION}.run.app>
EOF
