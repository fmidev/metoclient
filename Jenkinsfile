#!groovy

# TODO: fix NPM path problems (/usr/local/bin/npm -> npm)

def packageVersion = "undefined"
def deployUserAndHost = "fmi@io.elmo.fmi.fi"
def deployProductionBaseDirectory = "/fmi/prod/www/cdn.fmi.fi/javascript/metoclient"
def deployNonProductionBaseDirectory = "/fmi/dev/www/test.fmi.fi/javascript/metoclient"

pipeline {

    agent {
        node {
            label 'ndevinfra.fmi.fi'
        }
    }

    tools {
        nodejs 'nodejs-14'
    }

    options {
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '3'))
    }

    stages {
        stage('Configure http proxy') {
            when { expression { env.HTTP_PROXY != '' } }
            steps {
                sh "/usr/local/bin/npm config set proxy ${env.HTTP_PROXY}"
            }
        }

        stage('Configure https proxy') {
            when { expression { env.HTTPS_PROXY != '' } }
            steps {
                sh "/usr/local/bin/npm config set https-proxy ${env.HTTPS_PROXY}"
            }
        }

        stage('Install') {
            steps {
                sh "env"
                sh "/usr/local/bin/npm --version"
                sh "node --version"
                sh "/usr/local/bin/npm install"
            }
        }

        stage('Build') {
            steps {
                sh "/usr/local/bin/npm run build"
            }
        }

        stage('Test') {
            steps {
                sh "/usr/local/bin/npm test || echo \"Some or all tests failed\""
            }
            // This syntax requires a newer Pipeline plugin
            /*steps {
                catchError(buildResult: 'SUCCESS', stageResult: 'FAILURE') {
                    sh "/usr/local/bin/npm test"
                }
            }*/
        }

        stage('Determine version from package.json') {
            steps {
                script {
                     packageVersion = sh(returnStdout: true, script: 'jq --raw-output .version package.json').trim()
                }
            }
        }

        stage('Require unique production deploy directory') {
            when { environment name: 'BRANCH_NAME', value: 'main' }
            steps {
                sh "ssh ${deployUserAndHost} \"if [ -d ${deployProductionBaseDirectory}/${packageVersion} ]; then echo deploy directory already exists; exit 1; fi\""
            }
        }

        stage('Deploy to production') {
            when { environment name: 'BRANCH_NAME', value: 'main' }
            steps {
                sh "chmod --verbose --recursive u+r+w+X,g+r-w+X,o-r-w-x dist/"
                sh "ssh ${deployUserAndHost} \"mkdir --parents --mode=750 ${deployProductionBaseDirectory}/${packageVersion}\""
                sh "scp -rp dist/* ${deployUserAndHost}:${deployProductionBaseDirectory}/${packageVersion}/"
            }
        }

        stage('Deploy to non-production') {
            when { not { environment name: 'BRANCH_NAME', value: 'main' } }
            steps {
                sh "chmod --verbose --recursive u+r+w+X,g+r-w+X,o-r-w-x dist/"
                sh "ssh ${deployUserAndHost} \"mkdir --parents --mode=750 ${deployNonProductionBaseDirectory}/${env.BRANCH_NAME}/${env.BUILD_NUMBER}\""
                sh "scp -rp dist/* ${deployUserAndHost}:${deployNonProductionBaseDirectory}/${env.BRANCH_NAME}/${env.BUILD_NUMBER}/"
            }
        }

        stage('Publish package to npmjs.com') {
            when { environment name: 'BRANCH_NAME', value: 'main' }
            environment {
                NPM_TOKEN = credentials('npm-token')
            }
            steps {
                sh "echo //registry.npmjs.org/:_authToken=${env.NPM_TOKEN} > .npmrc"
                sh '/usr/local/bin/npm publish'
                sh 'rm .npmrc'
            }
        }
    }

    post {
        success {
            slackSend "Success ${env.JOB_NAME} ${packageVersion} (${env.BRANCH_NAME}/${env.BUILD_NUMBER}) (<${env.BUILD_URL}|Open>)"
        }
        unstable {
            slackSend "Unstable ${env.JOB_NAME} ${packageVersion} (${env.BRANCH_NAME}/${env.BUILD_NUMBER}) (<${env.BUILD_URL}|Open>)"
        }
        failure {
            slackSend "Failure ${env.JOB_NAME} ${packageVersion} (${env.BRANCH_NAME}/${env.BUILD_NUMBER}) (<${env.BUILD_URL}|Open>)"
        }
        changed {
            slackSend "Changed ${env.JOB_NAME} ${packageVersion} (${env.BRANCH_NAME}/${env.BUILD_NUMBER}) (<${env.BUILD_URL}|Open>)"
        }
    }
}
