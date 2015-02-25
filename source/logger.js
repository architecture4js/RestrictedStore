function Logger() {
    this.error = this.warning = this.msg = function(msg){
        console.log(msg);
    };
}

exports.logger = new Logger();