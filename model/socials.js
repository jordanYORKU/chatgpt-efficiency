import mongoose from 'mongoose';

const {Schema, model} = mongoose;

const SocialSchema = new Schema ({
    questionName: String,
    correctBoolean: Boolean,
    responseTimeMs: Number,
    domain: {
        type: String,
        default: 'Social'
    }
},

{
    timestamps: true
});

const Social = model('Social', SocialSchema);
export default Social;