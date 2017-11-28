import config from "../config";
import {message} from "antd";

//普通上传
const uploadToOSS = (file, host, path, accessId, expires, signature, headers={}) => {
  return fetch(`${host}/${encodeURIComponent(path)}?OSSAccessKeyId=${accessId}&Expires=${expires}&Signature=${encodeURIComponent(signature)}`, {
    method: 'PUT',
    headers: {
      ...headers,
    },
    body: file
  }).then((res) => {
    if (res.ok) {
      return `${host}/${encodeURIComponent(path)}`;
    } else {
      message.error('上传失败');
      return null;
    }
  })
}

//使用带有进度的上传, 只返回path，不返回host
const uploadToOSSWithProgress = (file, fileId, host, path, accessId, expires, signature, headers={}, onProgressChange, onabort) => {
  let xhr = new XMLHttpRequest();
  xhr.open('PUT', `${host}/${encodeURIComponent(path)}?OSSAccessKeyId=${accessId}&Expires=${expires}&Signature=${encodeURIComponent(signature)}`, true);
  onabort && onabort(xhr);

	// 中文名文件需要参照 RFC 6266 , 使用encode并设置字符集的Content-Disposition
  //xhr.setRequestHeader('Content-Disposition', `attachment;filename="${file.name}"`)
	const encodeFileName = encodeURI(file.name)
	xhr.setRequestHeader('Content-Disposition', `inline;filename="${encodeFileName}";filename*=utf-8''${encodeFileName}`)

  return new Promise((resolve, reject) => {
    xhr.onload = () => {
      resolve({
        path: path,
        host: host
      });
    };
    xhr.onerror = (error) => console.trace(error);
    xhr.onabort = () => reject('abort');
    xhr.onreadystatechange = () => {
      if (xhr.readyState == XMLHttpRequest.DONE) {
        if(xhr.status !== 200) {
          reject('not ok');
        }
      }
      else if (xhr.status === 0) {
        if (xhr.statusText === 'abort') {
          // Has been aborted,手动取消上传
          reject("abort");
        } else {
          // Offline mode
          throw new Error("异常");
        }
      }
    }
    xhr.upload.onprogress = (event) => {
      //上传进度
      if (event.lengthComputable) {
        onProgressChange && onProgressChange(parseInt((event.loaded/event.total)*100));
      }
    };

    xhr.send(file);
  })
}

export default {
  //上传身份认证图片
  uploadVerifyFile(file,userId, onProgressChange=null, onabort=null){
    return fetch(config.api.file.token.verifyFile,{
      method: 'POST',
      // credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'userId':userId,
      },
      body: JSON.stringify({
        verb: 'PUT',
        fileInfo: {
          fileName: file.name,
          contentType: file.type
        }
      })
    }).then((res)=>res.json()).then((json)=>{
      if(json.code === 0){
        const data = json.data;
        return uploadToOSSWithProgress(file, 0, data.host, data.path, data.accessId, data.expireTime, data.signature, {}, onProgressChange, onabort);
      } else if(json.code === 403){
        throw new Error("权限不足");
      } else {
        throw new Error("获取上传身份认证文件token失败！");
      }
    }).catch((err)=>{
      console.trace(err);
      message.error(err);
    })
  },

  // 上传物资图片
  uploatMaterialFile(affairId, roleId, file, warehouseId, materialId, onProgressChange = null, onabort = null) {
    return fetch(config.api.file.token.material(warehouseId), {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      affairId,
      roleId,
      body: JSON.stringify({
        verb: "PUT",
        fileInfo: {
          fileName: file.name,
          contentType: file.type
        }
      })
    }).then((res, err) => {
      return res.json()
    }).then(json => {
      if(json.code === 0) {
        const data = json.data;
        return uploadToOSSWithProgress(file, 0, data.host, data.path, data.accessId, data.expireTime, data.signature, {}, onProgressChange, onabort);
      } else if(json.code === 403) {
        throw new Error("权限不足");
      } else {
        throw new Error("获取上传聊天文件token失败！");
      }
    }).catch((err) => {
      //上传失败
      console.trace(err);
      message.error(err);
    })
  },

  //上传聊天图片
  uploadChatFile(file, affairId, roleId, onProgressChange = null, onabort = null) {
    return fetch(config.api.file.token.chat(), {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      affairId,
      roleId,
      body: JSON.stringify({
        verb: "PUT",
        fileInfo: {
          fileName: file.name,
          contentType: file.type
        }
      })
    }).then((res, err) => {
      return res.json()
    }).then(json => {
      if(json.code === 0) {
        const data = json.data;
        return uploadToOSSWithProgress(file, 0, data.host, data.path, data.accessId, data.expireTime, data.signature, {}, onProgressChange, onabort);
      }
      else if(json.code === 403) {
        throw new Error("权限不足");
      }
      else {
        throw new Error("获取上传聊天文件token失败！");
      }
    }).catch((err) => {
      //上传失败
      console.trace(err);
      message.error(err);
    })
  },

  //上传发布内图片、视频
  uploadAnnouncementFile(file, affairId, roleId, onProgressChange = null) {
    return fetch(config.api.file.token.announcement(affairId, roleId), {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      affairId,
      roleId,
      body: JSON.stringify({
        verb: "PUT",
        fileInfo: {
          fileName: file.name,
          contentType: file.type
        }
      })
    }).then((res, err) => {
      return res.json()
    }).then(json => {
      if(json.code === 0) {
        const data = json.data;
        return uploadToOSSWithProgress(file, 0, data.host, data.path, data.accessId, data.expireTime, data.signature, {}, onProgressChange, null);
      }
      else if(json.code === 403) {
        throw new Error("权限不足");
      }
      else {
        throw new Error("获取上传发布图片token！");
      }
    }).catch((err) => {
      //上传失败
      console.trace(err);
      message.error(err);
    })
  },

  //上传事务封面或发布视频，分为上传图片和视频（视频大于100M时采取分片上传）
  uploadAffairCover(affair, file, url, fileName, state = null, path = null, uploadId = null, partNumber = null) {
    if(!file) message.error('请选择文件！');

    let tokenRequestBody = {
      fileInfo: {
        fileName: fileName,
      },
    };//获取token的requestBody
    let uploadMethod = null; //获取token后上传方法，为Promise;

    if(file.type === 'image/png') {
      //因为裁剪图片后必定转为png，所以直接判断是否为png类型；上传图片不分大小
      tokenRequestBody.verb = "PUT";
      tokenRequestBody.fileInfo.contentType = file.type;
      uploadMethod = (data) => uploadToOSS(file, data.host, data.path, data.accessId, data.expireTime, data.signature);
    } else {
      //上传视频,分片上传，添加multipartArgs参数
      if(state === null) throw new Error('no state parameter');

      switch (state) {
        case "init":
          tokenRequestBody.verb = "POST";
          tokenRequestBody.multipartArgs = {
            init: true
          };
          break;
        case "end":
          if(uploadId === null || path === null) throw new Error('no uploadId or path parameter');
          tokenRequestBody.verb = "POST";
          tokenRequestBody.multipartArgs = {
            init: false,
            uploadId: uploadId,
            path: path
          };
          tokenRequestBody.fileInfo.contentType = "application/xml";
          break;
        case "upload":
          if(uploadId === null || partNumber === null || path === null) throw new Error('no uploadId or partNumber or path parameter');
          tokenRequestBody.verb = "PUT";
          tokenRequestBody.multipartArgs = {
            uploadId: uploadId,
            partNumber: partNumber+1,
            path: path
          };
          // tokenRequestBody.fileInfo.contentType = file.type;
          break;
        case "abort":
          if(uploadId === null || path === null) throw new Error('no uploadId or path parameter');
          tokenRequestBody.verb = "DELETE";
          tokenRequestBody.multipartArgs = {
            uploadId: uploadId,
            path: path
          }
          break;
        default:
          throw new Error('wrong state type!');
      }
      uploadMethod = data => data;
    }

    return fetch(url, {
      method: 'POST',
      credentials: 'include',
      affairId: affair.get('id'),
      roleId: affair.get('roleId'),
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(tokenRequestBody)
    }).then((res, err) => {
      return res.json()
    }).then(json => {
      if(json.code === 0) {
        const data = json.data;
        return uploadMethod(data);
      }else if(json.code === 403) {
        throw new Error("权限不足");
      }else {
        throw new Error("获取token失败！");
      }

    }).catch((err) => {
      //上传失败
      console.trace(err);
      message.error(err.message || err);
      return null;
    })
  },

  //上传事务文件
  uploadAffairFile(file, affairId, roleId, fileId, onProgressChange = null, onabort = null) {
    return fetch(config.api.file.token.file(), {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      affairId,
      roleId,
      body: JSON.stringify({
        verb: "PUT",
        fileInfo: {
          fileName: file.name,
          contentType: file.type,
          fileId,
        }
      })
    }).then((res, err) => {
      return res.json()
    }).then(json => {
      if(json.code === 0) {
        const data = json.data;
        return uploadToOSSWithProgress(file, fileId, data.host, data.path, data.accessId, data.expireTime, data.signature, {}, onProgressChange, onabort);
      }
      else if(json.code === 403) {
        throw new Error("权限不足");
      }
      else {
        throw new Error("获取上传token失败！");
      }

    }).catch((err) => {
      if(err === "not ok" || err === "abort") {
        return null;
      }

      //上传失败
      console.log(err);
      message.error(err.message || err);;
      return null;
    })
  },

  deleteAffairFile(fileId, affairId, roleId) {
    return fetch(config.api.file.token.delete_file(), {
      method: 'POST',
      credentials: 'include',
      affairId,
      roleId,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fileIds: Array.isArray(fileId) ? fileId : [fileId],
      })
    })
  },

  //获取文件token
  getFileToken(url, affairId, roleId, fileId, fileName, version=1) {
    return fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      affairId,
      roleId,
      body: JSON.stringify({
        verb: "GET",
        fileInfo: {
          fileId: fileId,
          version: version,
          extraInfo: `response-content-disposition=${`attachment;filename="${fileName}"`}`
        }
      })
    }).then((res, err) => {
      return res.json()
    }).then(json => {
      if(json.code === 0) {
        const data = json.data;
        const path = data.path;
        return `${data.host}/${encodeURIComponent(path)}?OSSAccessKeyId=${data.accessId}&Expires=${data.expireTime}&Signature=${encodeURIComponent(data.signature)}&response-content-disposition=${encodeURIComponent(`attachment;filename="${fileName}"`)}`;
      }
      else if(json.code === 403) {
        throw new Error("权限不足");
      }
      else {
        throw new Error('获取token失败！');
      }
    }).catch((err) => {
      console.trace(err);
      message.error(err.message || err);;
      return null;
    })
  },

  //获取预览token
  getPreviewToken(affairId, roleId, fileId, name, version = 1) {
    return fetch(config.api.file.token.preview(fileId, version), {
      method: 'GET',
      credentials: 'include',
      affairId,
      roleId,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    }).then((res, err) => {
      return res.json()
    }).then(json => {
      if(json.code === 0) {
        const data = json.data;
        if(data) {
          return `${data.host}/${encodeURIComponent(data.path)}?OSSAccessKeyId=${data.accessId}&Expires=${data.expireTime}&Signature=${encodeURIComponent(data.signature)}`;
        }
        else {
          return null;
        }
      }
      else if(json.code === 403) {
        throw new Error("权限不足");
      }
      else {
        message.error('获取预览文件token失败！');
      }
    }).catch((err) => {
      console.trace(err);
      message.error(err.message || err);;
      return null;
    })
  },
  //开始分片上传，取得uploadId
  getUploadMultipartId(host, objectName, accessId, expires, signature) {
    return fetch(`${host}/${encodeURIComponent(objectName)}?uploads&Signature=${encodeURIComponent(signature)}&Expires=${expires}&OSSAccessKeyId=${accessId}`, {
      method: 'POST',
    }).then(res => {
      return res.text()
    }).then(body => {
      const regex = /\<UploadId\>(.*)\<\/UploadId\>/g
      return regex.exec(body)[1]
    })
  },
  //进行分片上传
  uploadToOSSWithMultipart(host, objectName, uploadId, partIndex, accessId, expires, signature, data) {
    // aliOSS 从1开始计数。
    partIndex += 1;

    return fetch(`${host}/${encodeURIComponent(objectName)}?partNumber=${partIndex}&uploadId=${uploadId}&Signature=${encodeURIComponent(signature)}&Expires=${expires}&OSSAccessKeyId=${accessId}`, {
      method: 'PUT',
      body: data,
    }).then(res => {
      return res.headers.get('etag')
    })
  },
  //完成分片上传
  completeMultipartUpload(host, objectName, uploadId, accessId, expires, signature, etagList) {
    const etagXML = `<CompleteMultipartUpload>${etagList.map((etag, key)=>`<Part><PartNumber>${key+1}</PartNumber><ETag>${etag}</ETag></Part>`).join('')}</CompleteMultipartUpload>`

    return fetch(`${host}/${encodeURIComponent(objectName)}?uploadId=${uploadId}&Signature=${encodeURIComponent(signature)}&Expires=${expires}&OSSAccessKeyId=${accessId}`, {
      method: 'POST',
      body: etagXML,
      headers: {
        'Content-Type': 'application/xml'
      },
    }).then(res => {
      return res
    })
  },
  //终止分片上传
  abortMultipartUpload(host, objectName, uploadId, accessId, expires, signature) {
    return fetch(`${host}/${encodeURIComponent(objectName)}?uploadId=${uploadId}&Signature=${encodeURIComponent(signature)}&Expires=${expires}&OSSAccessKeyId=${accessId}`, {
      method: 'DELETE',
    }).then(res => {
      return res
    })
  },
}
