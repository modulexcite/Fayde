module.exports = function (grunt) {
    grunt.loadNpmTasks('grunt-typescript');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-qunit');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-shell');

    grunt.initConfig({
        nuget: grunt.file.readJSON('./nuget.json'),
        pkg: grunt.file.readJSON('./package.json'),
        typescript: {
            build: {
                src: ['src/**/*.ts'],
                dest: 'Fayde.js',
                options: {
                    target: 'es5',
                    declaration: true,
                    sourceMap: true
                }
            },
            test: {
                src: ['test/**/*.ts'],
                options: {
                    target: 'es5',
                    module: 'amd',
                    sourceMap: true
                }
            }
        },
        copy: {
            pretest: {
                files: [
                    { expand: true, flatten: true, src: ['Source/Fayde.Client/Themes/*'], dest: 'test/lib/Fayde/Themes', filter: 'isFile' },
                    { expand: true, flatten: true, src: ['Source/Fayde.Client/Fayde.js'], dest: 'test/lib/Fayde', filter: 'isFile' },
                    { expand: true, flatten: true, src: ['Source/Fayde.Client/Fayde.d.ts'], dest: 'test/lib/Fayde', filter: 'isFile' }
                ]
            }
        },
        qunit: {
            all: ['test/**/*.html']
        },
        watch: {
            files: 'src/**/*.ts',
            tasks: ['typescript:build']
        },
        shell: {
            package: {
                options: {
                    stdout: true,
                    stderr: true
                },
                command: 'powershell ./package.ps1 <%= pkg.version %>'
            },
            publish: {
                options: {
                    stdout: true,
                    stderr: true
                },
                command: 'nuget push "./nuget/exjs.<%= pkg.version %>.nupkg" <%= nuget.apiKey %>'
            }
        }
    });

    grunt.registerTask('default', ['typescript:build']);
    grunt.registerTask('test', ['typescript:build', 'copy:pretest', 'typescript:test', 'qunit']);
    grunt.registerTask('package', ['shell:package']);
    grunt.registerTask('publish', ['shell:package', 'shell:publish']);
};