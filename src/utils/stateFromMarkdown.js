import {
  ContentBlock,
  ContentState,
  CharacterMetadata,
  Entity,
  genKey,
} from 'draft-js'
import {
  Repeat,
  List,
  fromJS,
  toJS,
} from 'immutable'
import _ from 'lodash'

const rules = {
  heading: /^\s*(#{1,3}) ([^\n]+?) ?#* *(?:\n+|$)/,
  code: /^ *(`{3,}|~{3,}) *$/,
  blockquote: /^ *> {1}(.*)$/,
  image: /^(\!\[(.*?)\])\((.*?)\)$/,
  video: /^\[(\!\[(.*?)\])\((.*?)\)\]\((.*?)\)$/,
  table:{
    exec:function(text){
      let temp = text.split('\n')
      if(temp.length > 2 && temp[1] != ''){//整个表格是一个block,每行用\n分开
        return {data:temp.reduce(function(p,c){
          p.push(c.split('|'));
          return p
        },[]),type:1}
      }
      else if(temp.length == 1){//整个表格是多个block
        let temp2 = temp[0].split('|')
        if(temp2.length > 2 && temp[1] != ''){
          return {data:temp2,type:0}
          }else{
            return null
        }
      }else {
        return null;
      }
    },
  },
}

const inlineDecorator = List(
  [
    (src, characterList) => {
      // Inline bold text, it's not greedy
      const re = /(\*\*([^\*].*?)\*\*)|(__([^(__)].*?)__)/g
      let newSrc = "" + src
      let cap
      while (cap = re.exec(src)) {
        const rawCap = cap[0]
        characterList = characterList.map((char, index) => {
          if (index == cap.index || index == cap.index + 1) {
            return null
          } else if (index == cap.index + rawCap.length - 1 || index == cap.index + rawCap.length - 2) {
            return null
          } else if (index > cap.index + 1 && index < cap.index + rawCap.length - 2) {
            return char.update('style', style => style.add('BOLD'))
          } else {
            return char
          }
        })
        newSrc = newSrc.replace(rawCap, cap[2] || cap[4])
      }
      return {
        src: newSrc,
        characterList: characterList.filter(v => !!v)
      }
    },
    (src, characterList) => {
      // Inline italic text, it's greedy, go ask github why it's greedy.
      const re = /(\*([^\*].*)\*)|(_([^(_)].*)_)/g
      let newSrc = "" + src
      let cap
      while (cap = re.exec(src)) {
        const rawCap = cap[0]
        characterList = characterList.map((char, index) => {
          if (index == cap.index) {
            return null
          } else if (index == cap.index + rawCap.length - 1) {
            return null
          } else if (index > cap.index && index < cap.index + rawCap.length - 1) {
            return char.update('style', style => style.add('ITALIC'))
          } else {
            return char
          }
        })
        newSrc = newSrc.replace(rawCap, cap[2] || cap[4])
      }
      return {
        src: newSrc,
        characterList: characterList.filter(v => !!v)
      }
    },
    (src, characterList) => {
      // Inline link
      const re = /(\[(.*?)\])\((.*?)\)/g
      let newSrc = "" + src
      let cap
      while (cap = re.exec(src)) {
        const rawCap = cap[0]
        const prefix = cap[1]
        const description = cap[2]
        const url = cap[3]
        const entityKey = url ? Entity.create('LINK', 'MUTABLE', {url}) : null
        characterList = characterList.map((char, index) => {
          if (index == cap.index || index == cap.index + description.length + 1) {
            return null
          } else if (index > cap.index + prefix.length - 1 && index < cap.index + prefix.length + url.length + 2) {
            return null
          } else if (index > cap.index && index < cap.index + description.length +1){
            return char.update('entity', entity => entityKey)
          } else {
            return char
          }
        })
        newSrc = newSrc.replace(rawCap, cap[2])
      }
      return {
        src: newSrc,
        characterList: characterList.filter(v => !!v)
      }
    },
  ]
)

const pushTableBlock = function(tableContent,blocksArray,contentBlock){
  //添加表格block以及表格后面的block

  //创建entity
  let entityKey = Entity.create('table','MUTABLE',{
    columnCount: tableContent[0].length,
    rowCount: tableContent.length-1,
    data:(fromJS(tableContent.reduce(function(p,c,ci){
      if(c.length >1 && ci != 1){
        p.push(c)
      }
      return p
    },[]))).toJS()
  });
  let characterList = CharacterMetadata.applyEntity(CharacterMetadata.create(),entityKey)
  //添加tableblock

  //移除原有的表格或者原有的输入内容
  if(tableContent.length > 3){
    blocksArray.pop()
  }else{
    blocksArray.pop()
    blocksArray.pop()
  }

  //添加表格
  blocksArray.push(new ContentBlock({
    key:genKey(),
    type:'atomic',
    text:" ",
    characterList: List([characterList])
  }))
}
//添加非表格block
const pushPlainBlock = function(currentBlock,blocksArray,blockType){
  let src = currentBlock.getText().replace(/\r\n|\r/g, '\n')
    .replace(/\t/g, '    ')
    .replace(/\u00a0/g, ' ')
    .replace(/\u2424/g, '\n')
  let characterList = List(Repeat(CharacterMetadata.create(), src.length))
  let newTextContent = inlineDecorator.reduce((v, decoreator) => decoreator(v.src, v.characterList), {
    src,
    characterList,
  })
  blocksArray.push(new ContentBlock({
    key: currentBlock.getKey(),
    type: blockType,
    text: newTextContent.src,
    characterList: newTextContent.characterList,
  }))
}

const transformContentBlock = (previousBlock,contentBlock,currentIndex) => {
    let src = contentBlock.getText().replace(/\r\n|\r/g, '\n')
      .replace(/\t/g, '    ')
      .replace(/\u00a0/g, ' ')
      .replace(/\u2424/g, '\n')

    // Parse block type
    let blockType = 'unstyled'
    let cap
    let canAddBlock = true;
    let hasImage = false;
    let hasVideo = true
    // header-line
    if ((cap = rules.heading.exec(src)) && !previousBlock.flag.codeTag) {
      switch (cap[1].length) {
        case 1:
          blockType = 'header-one'
          break
        case 2:
          blockType = 'header-two'
          break
        case 3:
          blockType = 'header-three'
          break
        default:
          blockType = 'unstyled'
      }
      src = cap[2]
    }
    // code block
    if ((cap = rules.code.exec(src)) || previousBlock.flag.codeTag) {
      previousBlock.flag.codeTag = cap ? !previousBlock.flag.codeTag : previousBlock.flag.codeTag;
      if(cap){
        canAddBlock = false
      }else if(previousBlock.flag.codeTag){
        blockType = 'code-block'
      }
    }
    // blockquote
    if ((cap = rules.blockquote.exec(src)) && !previousBlock.flag.codeTag) {
      src = cap[1]
      blockType = 'blockquote'
    }

    if ((cap = rules.table.exec(src)) && !previousBlock.flag.codeTag) {
      //阻止默认的block添加行为

      canAddBlock = false
      if(cap.type){
        //整个表格是一个block
        previousBlock.flag.tableContent = cap.data.reduce(function(p,c,ci){
          if(ci != 1 && c.length >1){
            p.push(c)
          }
          return p
        },[])
        blockType = "atomic"
        canAddBlock = true
      }else{
        previousBlock.flag.tableTag = true;
        if(previousBlock.flag.tableContent.length == 0){
          previousBlock.flag.tableContent.push(cap.data);
          pushPlainBlock(contentBlock,previousBlock.blocksArray,'unstyled')
        }else if(previousBlock.flag.tableContent.length == 1){
          if(cap.data.length == _.last(previousBlock.flag.tableContent).length){
            //判断是表头
            previousBlock.flag.tableContent.push(cap.data)
            pushPlainBlock(contentBlock,previousBlock.blocksArray,'unstyled')
          }else{
            //判断不是表头
            pushPlainBlock(contentBlock,previousBlock.blocksArray,'unstyled')
          }
        }else if(previousBlock.flag.tableContent.length == 2){
          //添加了表头后填充表体
          if(cap.data.length == _.last(previousBlock.flag.tableContent).length){
            previousBlock.flag.tableContent.push(cap.data);
            previousBlock.flag.isATable = true
          }else{
            previousBlock.flag.tableContent.push(cap.data)
            pushPlainBlock(contentBlock,previousBlock.blocksArray,'unstyled')
          }
        }else if(previousBlock.flag.tableContent.length >2){
          //表格尾部添加一行
          if(cap.data.length == _.last(previousBlock.flag.tableContent).length){
            previousBlock.flag.tableContent.push(cap.data);
            previousBlock.flag.isATable = true
          }else{
            previousBlock.flag.tableContent.push(cap.data)
          }
        }
        if(previousBlock.flag.isATable){
          pushTableBlock(previousBlock.flag.tableContent,previousBlock.blocksArray)
        }
      }
    }
    if((rules.table.exec(src) == null) && previousBlock.flag.tableTag){
      previousBlock.flag.tableTag = false;
      previousBlock.flag.isATable = false;
      previousBlock.flag.tableContent = []
    }

    // image
    let imageURL = "";
    if ((cap = rules.image.exec(src)) && !previousBlock.flag.codeTag) {
      hasImage = true;
      blockType = 'atomic';
      imageURL = cap[3];
    }

    let videoURL = "";
    if ((cap = rules.video.exec(src)) && !previousBlock.flag.codeTag) {
      hasVideo = true;
      blockType = 'atomic';
      videoURL = cap[3];
    }

    if(canAddBlock){
      switch (blockType) {
        case 'atomic':{
          if (hasImage) {
            const entityKey = Entity.create('MEDIA', 'IMMUTABLE', {
              src: imageURL
            });
            const characterList = CharacterMetadata.applyEntity(CharacterMetadata.create(), entityKey);
            previousBlock.blocksArray.push(new ContentBlock({
              key: contentBlock.getKey(),
              type: blockType,
              text: " ",
              characterList: List([characterList]),
            }))
          } else if (hasVideo) {
            const entityKey = Entity.create('MEDIA', 'IMMUTABLE', {
              src: videoURL,
              type: 'video',
            });
            const characterList = CharacterMetadata.applyEntity(CharacterMetadata.create(), entityKey);
            previousBlock.blocksArray.push(new ContentBlock({
              key: contentBlock.getKey(),
              type: blockType,
              text: " ",
              characterList: List([characterList]),
            }))
          } else {
            let entityKey = Entity.create('table', 'MUTABLE', {
              columnCount: previousBlock.flag.tableContent[0].length,
              rowCount: previousBlock.flag.tableContent.length,
              data: (fromJS(previousBlock.flag.tableContent)).toJS()
            });
            let characterList = CharacterMetadata.applyEntity(CharacterMetadata.create(), entityKey)
            previousBlock.flag.tableContent = []
            previousBlock.blocksArray.push(new ContentBlock({
              key: contentBlock.getKey(),
              type: blockType,
              text: " ",
              characterList: List([characterList])
            }))
          }
          break;
        }
        default:{
          // Parse inline style
          const characterList = List(Repeat(CharacterMetadata.create(), src.length))
          const newTextContent = inlineDecorator.reduce((v, decorator) => decorator(v.src, v.characterList), {
            src,
            characterList,
          })
          previousBlock.blocksArray.push(new ContentBlock({
            key: contentBlock.getKey(),
            type: blockType,
            text: newTextContent.src,
            characterList: newTextContent.characterList,
          }))
        }
      }
    }

    return {
      blocksArray:previousBlock.blocksArray,
      flag:previousBlock.flag
    }
}

const stateFromMarkdown = (contentState) => {
  const newBlocksArray = contentState.getBlocksAsArray().reduce(
    function(previousValue,currentValue,currentIndex){
      return transformContentBlock(previousValue,currentValue,currentIndex)
    },
    {
      blocksArray:[],
      flag:{
        tableContent: [],
        tableTag: false,
        codeContent: [],
        codeTag: false,
      }}
    ).blocksArray
    let result  = ContentState.createFromBlockArray(newBlocksArray)
  return result
}

export default stateFromMarkdown
