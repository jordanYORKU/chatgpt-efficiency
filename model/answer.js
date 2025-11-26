import mongoose from 'mongoose';

const {Schema, model} = mongoose;

const answersSchema = new Schema ({
    questionName: String,
    correctBoolean: Boolean,
    responseTime: Number,
    domain: String

},

{
    timestamps: true
});

const Answer = model('Answer', answersSchema);
export default Answer;