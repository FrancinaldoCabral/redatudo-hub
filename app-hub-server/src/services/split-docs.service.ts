import { PreviewUsageAnthropic } from './preview-usage.service'

const previewTokens = new PreviewUsageAnthropic()

interface PageObject {
    pageContent: string
}


function countTokens(pageContent: string): number {
    const tokens = previewTokens.count(pageContent)
    return tokens
}

export function reduceArray(array: PageObject[], limitTokens: number): PageObject[] {
    const result: PageObject[] = []
    let currentContent = ''

    for (const obj of array) {
        const objTokens = countTokens(obj.pageContent)
        if (countTokens(currentContent) + objTokens <= limitTokens) {
            currentContent += obj.pageContent
        } else {
            result.push({ pageContent: currentContent })
            currentContent = obj.pageContent
        }
    }

    // Adiciona o último conteúdo ao resultado
    if (currentContent !== '') {
        result.push({ pageContent: currentContent })
    }

    return result
}