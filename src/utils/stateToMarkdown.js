import {
  getEntityRanges,
  BLOCK_TYPE,
  ENTITY_TYPE,
  INLINE_STYLE,
} from 'draft-js-utils';
import {
  Entity,
  ContentState,
  CharacterMetadata,
  ContentBlock,
  genKey,
} from 'draft-js';
import {
  Repeat,
  List,
} from 'immutable'

import _ from 'lodash'

const {
  BOLD,
  CODE,
  ITALIC,
} = INLINE_STYLE;

const CODE_INDENT = '    ';

class MarkupGenerator {
  constructor(contentState) {
    this.contentState = contentState;
  }

  generate() {
    this.output = [];
    this.blocks = this.contentState.getBlockMap().toArray();
    this.totalBlocks = this.blocks.length;
    this.currentBlock = 0;
    while (this.currentBlock < this.totalBlocks) {
      this.processBlock();
    }

    return ContentState.createFromBlockArray(this.output);
  }

  processBlock() {
    let block = this.blocks[this.currentBlock];
    let blockType = block.getType();
    let blockText = this.renderBlockContent(block)
    const character = CharacterMetadata.create()

    switch (blockType) {
      case BLOCK_TYPE.HEADER_ONE:
        blockText = '# ' + blockText
        this.output.push(new ContentBlock({
          key: block.getKey(),
          type: 'unstyled',
          text: blockText,
          characterList: List(Repeat(character, blockText.length)),
        }));
        break;
      case BLOCK_TYPE.HEADER_TWO:
        blockText = '## ' + blockText
        this.output.push(new ContentBlock({
          key: block.getKey(),
          type: 'unstyled',
          text: blockText,
          characterList: List(Repeat(character, blockText.length)),
        }));
        break;
      case BLOCK_TYPE.HEADER_THREE:
        blockText = '### ' + blockText
        this.output.push(new ContentBlock({
          key: block.getKey(),
          type: 'unstyled',
          text: blockText,
          characterList: List(Repeat(character, blockText.length)),
        }));
        break;
      case BLOCK_TYPE.BLOCKQUOTE:
        blockText = '> ' + blockText
        this.output.push(new ContentBlock({
          key: block.getKey(),
          type: 'unstyled',
          text: blockText,
          characterList: List(Repeat(character, blockText.length)),
        }));
        break;
      case BLOCK_TYPE.CODE:
        const preCode = this.currentBlock > 0 ? this.blocks[this.currentBlock-1] : null;
        const nextCode = this.currentBlock < this.blocks.length - 1 ? this.blocks[this.currentBlock+1] : null;
        if((preCode == null) || (preCode.getType() != BLOCK_TYPE.CODE)){
          this.output.push(new ContentBlock({
            key: genKey(),
            type: 'unstyled',
            text: '```',
            characterList: List(Repeat(character, 3)),
          }));
        }
        this.output.push(new ContentBlock({
          key: block.getKey(),
          type: 'unstyled',
          text: blockText,
          characterList: List(Repeat(character, blockText.length)),
        }));
        if((nextCode == null) || (nextCode.getType() != BLOCK_TYPE.CODE)){
          this.output.push(new ContentBlock({
            key: genKey(),
            type: 'unstyled',
            text: '```',
            characterList: List(Repeat(character, 3)),
          }));
        }
        break;
      default:
        this.output.push(new ContentBlock({
          key: block.getKey(),
          type: 'unstyled',
          text: blockText,
          characterList: List(Repeat(character, blockText.length)),
        }));
        break;
    }
    this.currentBlock += 1;
  }

  renderBlockContent(block) {
    let blockType = block.getType();
    let text = block.getText();
    if (text === '') {
      // Prevent element collapse if completely empty.
      // TODO: Replace with constant.
      return '\u200B';
    }
    let charMetaList = block.getCharacterList();
    let entityPieces = getEntityRanges(text, charMetaList);
    return entityPieces.map(([entityKey, stylePieces]) => {
      let content = stylePieces.map(([text, style]) => {
        // Don't allow empty inline elements.
        if (!text) {
          return '';
        }
        let content = encodeContent(text);
        if (style.has(BOLD)) {
          content = `**${content}**`;
        }
        if (style.has(ITALIC)) {
          content = `_${content}_`;
        }

        return content;
      }).join('');

      let entity = entityKey ? Entity.get(entityKey) : null;

      if (entity != null && entity.getType() === ENTITY_TYPE.LINK) {
        let data = entity.getData();
        let url = data.url || '';
        let title = data.title ? ` "${escapeTitle(data.title)}"` : '';
        return `[${content}](${encodeURL(url)}${title})`;
      } else if (entity != null && entity.getType() === 'MEDIA') {
        let data = entity.getData()
        let src = data.src
        let alt = data.alt ? ` "${escapeTitle(data.alt)}"` : ''
        if (data.type === 'video') {
          return `[![${alt}]()](${encodeURL(src)})`
        } else {
          return `![${alt}](${encodeURL(src)})`
        }
      } else if(entity != null && entity.getType() === 'table'){
        return getMarkDownTable(entity.getData().rowCount,entity.getData().columnCount,entity.getData().data)
      } else {
        return content;
      }
    }).join('');
  }
}

function getMarkDownTable(row,col,data){
  let result = '';
  let partition = '';
  data.forEach((row,index) => {
    if(index == 0){//表头，表头与表体分开用------
      row.forEach((grid,gridNum) => {
        if(gridNum > 0){
          result = result + "|" + grid
          partition = partition + "|" + _.range(grid.length).fill('-').join('')
        }else{//第一列
          result = result + grid
          partition = _.range(grid.length).fill('-').join('')
        }
      })
      result = result + "\n"+partition + "\n"
    }else{
      row.forEach((grid,gridNum) => {
        if(gridNum > 0){
          result = result + "|" + grid
        }else{
          result = result + grid
        }
      })
      result = result + "\n"
    }

  })
  return result
}

function encodeContent(text) {
  return text.replace(/[*_`]/g, '\\$&');
}

// Encode chars that would normally be allowed in a URL but would conflict with
// our markdown syntax: `[foo](http://foo/)`
function encodeURL(url) {
  return url.replace(/\)/g, '%29');
}

// Escape quotes using backslash.
function escapeTitle(text) {
  return text.replace(/"/g, '\\"');
}

export default function stateToMarkdown(content) {
  return new MarkupGenerator(content).generate();
}
