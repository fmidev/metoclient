#!groovy

def packageVersion = "undefined"
def deployUserAndHost = "fmi@io.elmo.fmi.fi"
def deployProductionBaseDirectory = "/fmi/prod/www/cdn.fmi.fi/javascript/metoclient"
def deployNonProductionBaseDirectory = "/fmi/dev/www/test.fmi.fi/javascript/metoclient"

pipeline {

    agent {
        node {
            label 'built-in'
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
                sh "npm config set proxy ${env.HTTP_PROXY}"
            }
        }

        stage('Configure https proxy') {
            when { expression { env.HTTPS_PROXY != '' } }
            steps {
                sh "npm config set https-proxy ${env.HTTPS_PROXY}"
            }
        }

        stage('Install') {
            steps {
                sh "env"
                sh "npm --version"
                sh "node --version"
                sh "npm install"
            }
        }

        stage('Build') {
            steps {
                sh "npm run build"
            }
        }

        stage('Test') {
            steps {
                sh "npm test || echo \"Some or all tests failed\""
            }
            // This syntax requires a newer Pipeline plugin
            /*steps {
                catchError(buildResult: 'SUCCESS', stageResult: 'FAILURE') {
                    sh "npm test"
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
                sh 'echo //registry.npmjs.org/:_authToken=$NPM_TOKEN > .npmrc'
                sh 'npm publish'
                sh 'rm .npmrc'
            }
        }
    }

    post {
        success {
            slackSend(message: "Success ${env.JOB_NAME} ${packageVersion} (${env.BRANCH_NAME}/${env.BUILD_NUMBER}) (<${env.BUILD_URL}|Open>)")
        }
        unstable {
            slackSend(message: "Unstable ${env.JOB_NAME} ${packageVersion} (${env.BRANCH_NAME}/${env.BUILD_NUMBER}) (<${env.BUILD_URL}|Open>)")
        }
        failure {
            slackSend(message: "Failure ${env.JOB_NAME} ${packageVersion} (${env.BRANCH_NAME}/${env.BUILD_NUMBER}) (<${env.BUILD_URL}|Open>)")
        }
        changed {
            slackSend(message: "Changed ${env.JOB_NAME} ${packageVersion} (${env.BRANCH_NAME}/${env.BUILD_NUMBER}) (<${env.BUILD_URL}|Open>)")
        }
    }
}
