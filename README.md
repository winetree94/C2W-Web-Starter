# C2W Web Starter

이 프로젝트는 [container2wasm](https://github.com/ktock/container2wasm)을 현대적인 웹 프로젝트에 통합할 수 있도록 돕기 위한 프로젝트입니다. 주요 목표는 다음과 같습니다.

- Node 환경에서 c2w 를 통한 이미지 생성 과정 자동화 예제 제공
- 번들러와 타입스크립트 환경에서의 사용 예제 제공
- 더 많은 컨테이너 데모 제공

# Project Structure

- `packages/browser_runtime`: xterm-pty 를 사용하여 브라우저에서 컨테이너를 실행해주는 패키지
- `packages/builder`: c2w를 통한 이미지 생성을 자동화하는 빌더
- `packages/playground`: browser_runtime, builder 를 사용한 데모 페이지

각각의 패키지는 실험적 예제로 npm 으로 배포되지 않습니다.

# Development

## Install

프로젝트 실행을 위해선 yarn 패키지 매니저가 필요합니다. Node 가 설치되어 있는 경우 아래의 명령어로 yarn을 설치할 수 있습니다.

```bash
$ corepack enable
```

이후 다음의 명령어를 통해 프로젝트의 의존성을 설치합니다.

```bash
yarn
```

## Run playground

Playground 를 로컬로 실행시키기 위해선 다음에 명령어를 실행합니다.

```bash
yarn dev
```

## Build playground

Playground 를 빌드하기 위해 다음의 명령어를 실행합니다.

```bash
yarn build
```

# Image generation

> 이 과정은 x64 리눅스 환경만 지원합니다.

추가 이미지를 빌드하고 싶은 경우 builder 를 사용할 수 있습니다. 먼저 다음의 명령어를 통해 패키지를 빌드합니다.

```bash
yarn builder:build
```

`packages/playground/builder.json`

```bash
yarn playground:build:images
```

