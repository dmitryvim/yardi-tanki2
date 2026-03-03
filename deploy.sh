#!/usr/bin/env bash
set -euo pipefail

IMAGE="ghcr.io/dmitryvim/yardi-tanki2"
TAG="$(git rev-parse --short HEAD)"
FULL_IMAGE="$IMAGE:$TAG"

echo "▸ Building $FULL_IMAGE ..."
docker build --platform linux/amd64 -t "$FULL_IMAGE" -t "$IMAGE:latest" .

echo "▸ Pushing to registry ..."
docker push "$FULL_IMAGE"
docker push "$IMAGE:latest"

echo "✓ Pushed $FULL_IMAGE and $IMAGE:latest"
