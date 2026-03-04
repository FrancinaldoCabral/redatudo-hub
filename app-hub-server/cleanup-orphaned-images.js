#!/usr/bin/env node

/**
 * Script para limpeza manual de imagens órfãs
 *
 * Este script identifica e remove imagens que não estão sendo referenciadas
 * em nenhum conteúdo dos projetos.
 *
 * Uso:
 * node cleanup-orphaned-images.js [projectId]
 *
 * Se projectId não for especificado, processa todos os projetos.
 */

const { MongoClient, ObjectId } = require('mongodb');
const { deleteFile } = require('./src/services/local-bucket-upload.service');
const path = require('path');

// Carregar variáveis de ambiente
require('dotenv').config();

class OrphanedImagesCleaner {
    constructor() {
        this.mongoClient = null;
        this.db = null;
    }

    async connect() {
        try {
            const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/app-hub';
            this.mongoClient = new MongoClient(mongoUri);
            await this.mongoClient.connect();
            this.db = this.mongoClient.db();
        //    console.log('✅ Conectado ao MongoDB');
        } catch (error) {
            console.error('❌ Erro ao conectar ao MongoDB:', error);
            throw error;
        }
    }

    async disconnect() {
        if (this.mongoClient) {
            await this.mongoClient.close();
        //    console.log('✅ Desconectado do MongoDB');
        }
    }

    /**
     * Verifica se uma URL específica está referenciada no conteúdo
     */
    isImageReferenced(content, imageUrl) {
        return content && content.includes(imageUrl);
    }

    /**
     * Identifica imagens órfãs de um projeto
     */
    async identifyOrphanedImages(projectId) {
        try {
        //    console.log(`🔍 Analisando projeto: ${projectId}`);

            // Buscar todas as seções do projeto
            const sections = await this.db.collection('ebookSections').find({ projectId }).toArray();
        //    console.log(`📄 Encontradas ${sections.length} seções no projeto`);

            // Buscar todas as imagens do projeto
            const allImages = await this.db.collection('ebookImages').find({ projectId }).toArray();
        //    console.log(`🖼️  Encontradas ${allImages.length} imagens no projeto`);

            // Identificar imagens órfãs
            const orphanedImages = [];
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

            for (const image of allImages) {
                let isReferenced = false;

                // Verificar se a URL desta imagem aparece em qualquer seção do projeto
                for (const section of sections) {
                    if (this.isImageReferenced(section.content, image.url)) {
                        isReferenced = true;
                    //    console.log(`✅ Imagem ${image._id} ENCONTRADA na seção ${section._id}`);
                        break;
                    }
                }

                if (!isReferenced) {
                    // Verificar se foi criada há mais de 5 minutos (proteção contra remoção precoce)
                    if (image.createdAt < fiveMinutesAgo) {
                    //    console.log(`❌ Imagem ${image._id} NÃO encontrada - É ÓRFÃ (criada em ${image.createdAt})`);
                        orphanedImages.push(image);
                    } else {
                    //    console.log(`⏳ Imagem ${image._id} NÃO encontrada mas RECENTE - PRESERVADA (criada em ${image.createdAt})`);
                    }
                }
            }

            return orphanedImages;

        } catch (error) {
            console.error(`❌ Erro ao analisar projeto ${projectId}:`, error);
            throw error;
        }
    }

    /**
     * Remove imagens órfãs
     */
    async removeOrphanedImages(orphanedImages) {
        let removedCount = 0;
        let errorCount = 0;

    //    console.log(`\n🗑️  Iniciando remoção de ${orphanedImages.length} imagens órfãs...`);

        for (const image of orphanedImages) {
            try {
            //    console.log(`🗑️  Removendo imagem órfã: ${image._id} - ${image.url}`);

                // Remover do MinIO
                await deleteFile(image.minioPath);
            //    console.log(`  ✅ Removida do MinIO: ${image.minioPath}`);

                // Remover do banco
                await this.db.collection('ebookImages').deleteOne({ _id: image._id });
            //    console.log(`  ✅ Removida do banco: ${image._id}`);

                removedCount++;

            } catch (error) {
                console.error(`❌ Erro ao remover imagem ${image._id}:`, error);
                errorCount++;
            }
        }

        return { removedCount, errorCount };
    }

    /**
     * Processa um projeto específico
     */
    async processProject(projectId) {
        try {
        //    console.log(`\n🏗️  Processando projeto: ${projectId}`);

            // Verificar se o projeto existe
            const project = await this.db.collection('ebookProjects').findOne({ _id: new ObjectId(projectId) });
            if (!project) {
            //    console.log(`❌ Projeto ${projectId} não encontrado`);
                return { orphaned: [], removed: 0, errors: 0 };
            }

        //    console.log(`📋 Projeto encontrado: ${project.title || projectId}`);

            // Identificar imagens órfãs
            const orphanedImages = await this.identifyOrphanedImages(projectId);

            if (orphanedImages.length === 0) {
            //    console.log(`✅ Nenhuma imagem órfã encontrada no projeto ${projectId}`);
                return { orphaned: [], removed: 0, errors: 0 };
            }

            // Perguntar ao usuário se quer remover
        //    console.log(`\n⚠️  Encontradas ${orphanedImages.length} imagens órfãs no projeto ${projectId}`);
        //    console.log('As seguintes imagens serão removidas:');

            orphanedImages.forEach((img, index) => {
            //    console.log(`  ${index + 1}. ${img.url} (criada em ${img.createdAt})`);
            });

            // Em um script Node.js, podemos usar readline para perguntar ao usuário
            const readline = require('readline');
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });

            const answer = await new Promise((resolve) => {
                rl.question('\n❓ Deseja remover estas imagens órfãs? (s/N): ', (answer) => {
                    rl.close();
                    resolve(answer.toLowerCase());
                });
            });

            if (answer !== 's' && answer !== 'sim' && answer !== 'y' && answer !== 'yes') {
            //    console.log('❌ Operação cancelada pelo usuário');
                return { orphaned: orphanedImages, removed: 0, errors: 0 };
            }

            // Remover imagens órfãs
            const { removedCount, errorCount } = await this.removeOrphanedImages(orphanedImages);

        //    console.log(`\n✅ Projeto ${projectId} processado:`);
        //    console.log(`   - Imagens órfãs encontradas: ${orphanedImages.length}`);
        //    console.log(`   - Imagens removidas: ${removedCount}`);
        //    console.log(`   - Erros: ${errorCount}`);

            return { orphaned: orphanedImages, removed: removedCount, errors: errorCount };

        } catch (error) {
            console.error(`❌ Erro ao processar projeto ${projectId}:`, error);
            throw error;
        }
    }

    /**
     * Processa todos os projetos
     */
    async processAllProjects() {
        try {
        //    console.log('🔍 Buscando todos os projetos...');

            const projects = await this.db.collection('ebookProjects').find({}).toArray();
        //    console.log(`📋 Encontrados ${projects.length} projetos`);

            let totalOrphaned = 0;
            let totalRemoved = 0;
            let totalErrors = 0;

            for (const project of projects) {
                try {
                    const result = await this.processProject(project._id.toString());
                    totalOrphaned += result.orphaned.length;
                    totalRemoved += result.removed;
                    totalErrors += result.errors;
                } catch (error) {
                    console.error(`❌ Erro ao processar projeto ${project._id}:`, error);
                    totalErrors++;
                }
            }

        //    console.log(`\n📊 RESUMO GERAL:`);
        //    console.log(`   - Projetos processados: ${projects.length}`);
        //    console.log(`   - Total de imagens órfãs encontradas: ${totalOrphaned}`);
        //    console.log(`   - Total de imagens removidas: ${totalRemoved}`);
        //    console.log(`   - Total de erros: ${totalErrors}`);

        } catch (error) {
            console.error('❌ Erro ao processar todos os projetos:', error);
            throw error;
        }
    }

    /**
     * Método principal
     */
    async run() {
        try {
        //    console.log('🚀 Iniciando limpeza de imagens órfãs...');
        //    console.log('⚠️  ATENÇÃO: Este script irá remover imagens permanentemente!');
        //    console.log('💡 Recomenda-se fazer backup antes de executar.\n');

            await this.connect();

            const projectId = process.argv[2]; // Primeiro argumento da linha de comando

            if (projectId) {
            //    console.log(`🎯 Processando projeto específico: ${projectId}`);
                await this.processProject(projectId);
            } else {
            //    console.log('🎯 Processando todos os projetos');
                await this.processAllProjects();
            }

        //    console.log('\n✅ Limpeza concluída com sucesso!');

        } catch (error) {
            console.error('\n❌ Erro durante a execução:', error);
            process.exit(1);
        } finally {
            await this.disconnect();
        }
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    const cleaner = new OrphanedImagesCleaner();
    cleaner.run();
}

module.exports = OrphanedImagesCleaner;
