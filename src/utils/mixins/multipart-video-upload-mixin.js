import {
	message
} from 'antd'
import oss from 'oss'
import {
	Range,
	Map,
	List,
} from 'immutable'

const SLICE_SIZE = 1000000
const SLICE_GROUP_SIZE = 4

const MultipartVideoUploadMixin = {
	getInitialState() {
		return {
			uploadId: null,
			videoProgress: 0,
			isVideoUploadFailure: false,
		}
	},

	// Handler
	handleCancelUpload(file) {
		oss.uploadAffairCover(this.props.affair, file, this.state.uploadApi, file.name, "abort", this._objectName, this.state.uploadId).then((data) => {
			oss.abortMultipartUpload(data.host, this._objectName, this.state.uploadId, data.accessId, data.expireTime, data.signature).then(() => {
        this._objectName = null
        this._multipartUploadVideoProgress = null
        this._cb = () => {}
        this.setState({
          uploadId: null,
          isVideoUploadFailure: false,
        })
			});
		})
	},
	handleUploadVideo(file, fileName, userid, cb) {
		if (!fileName) {
			message.error('文件名不能为空')
		} else if (!file) {
			message.error('请选择一个文件')
		} else if (!userid && !this._objectName) {
			throw Error('Unknown userid passed in MultipartVideoUploadMixin.handleUploadVideo')
		} else {

			if (this._multipartUploadVideoProgress && this.state.uploadId && this._objectName) {
				// 继续上传文件。
				this.findNewSliceToUpload(file, this.state.uploadId, bucketName, this._objectName)
			} else {
				this._cb = cb || (() => {})
				oss.uploadAffairCover(this.props.affair, file, this.state.uploadApi, file.name, "init").then((data) => {
					this._objectName = data.path.replace("?uploads", "");
					oss.getUploadMultipartId(data.host, this._objectName, data.accessId, data.expireTime, data.signature).then(uploadId => {
            this.setState({
              uploadId,
            }, () => {
              // 以 SLICE_SIZE 大小为一片。
              const sliceCount = Math.ceil(file.size / SLICE_SIZE)
              this._multipartUploadVideoProgress = List(Range(0, sliceCount).map(sliceIndex => Map({
                start: sliceIndex * SLICE_SIZE,
                end: Math.min(sliceIndex * SLICE_SIZE + SLICE_SIZE, file.size),
                index: sliceIndex,
                etag: null,
                isUploading: false,
              })))

              this.findNewSliceToUpload(file, this.state.uploadId, this._objectName)
            })
          }).catch(err => {
            this.setState({
              isVideoUploadFailure: true,
            })
          })
				});
			}
		}
	},
  findNewSliceToUpload(file, uploadId, objectName) {
    while (this._multipartUploadVideoProgress.filter(v => v.get('isUploading')).size < SLICE_GROUP_SIZE) {
      const readyToUploadSliceKey = this._multipartUploadVideoProgress.findKey(v => !v.get('etag') && !v.get('isUploading'))
      if (readyToUploadSliceKey !== undefined) {
        // 标记该片正在上传
        this._multipartUploadVideoProgress = this._multipartUploadVideoProgress.update(readyToUploadSliceKey, v => v.set('isUploading', true))
        this.uploadSlice(readyToUploadSliceKey, file, uploadId, objectName)
      } else {
        break
      }
    }
  },
  uploadSlice(readyToUploadSliceKey, file, uploadId, objectName) {
    let slice = this._multipartUploadVideoProgress.get(readyToUploadSliceKey)
    const content = file.slice(slice.get('start'), slice.get('end'))

    // 上传碎片
    oss.uploadAffairCover(this.props.affair, file, this.state.uploadApi, file.name, "upload", this._objectName, uploadId, readyToUploadSliceKey).then((data) => {
    	oss.uploadToOSSWithMultipart(data.host, this._objectName, uploadId, readyToUploadSliceKey, data.accessId, data.expireTime, data.signature, content).then((etag) => {
        this.setState({
          isVideoUploadFailure: false,
        })

				//中断上传
				if(!this._multipartUploadVideoProgress) return;

        // 标记该片上传完成。
        this._multipartUploadVideoProgress = this._multipartUploadVideoProgress.update(readyToUploadSliceKey, v => v.set('isUploading', false).set('etag', etag))

        // 更新进度条。
        this.setState({
          videoProgress: 100 * (this._multipartUploadVideoProgress.filter(v => v.get('etag') && !v.get('isUploading')).size / this._multipartUploadVideoProgress.size),
        })

        // 如果所有片都已上传完成，则标志该文件上传完成。
        if (this._multipartUploadVideoProgress.every(v => v.get('etag') && !v.get('isUploading'))) {
          oss.uploadAffairCover(this.props.affair, file, this.state.uploadApi, file.name, "end", this._objectName, uploadId).then((data) => {
            oss.completeMultipartUpload(data.host, objectName, uploadId, data.accessId, data.expireTime, data.signature, this._multipartUploadVideoProgress.map(v => v.get('etag'))).then((res) => {
              return res
            }).then((res) => {
              this._cb(res)
            }).then(() =>{
              // this.handleCancelUpload()
            }).catch(err => {
              this.setState({
                isVideoUploadFailure: true,
              })
            })
          })
          return
        }

        // 开始新的片的上传。
        this.findNewSliceToUpload(file, uploadId, objectName)
      }).catch(err => {
        // 若所有的片都停止了上传，则标记该次上传被中断。
        console.trace(err);
      });
		})
  },
}

export default MultipartVideoUploadMixin
