import { kStringMaxLength } from 'buffer';
import mongoose from 'mongoose';

const {Schema, model} = mongoose;

const questionsSchema = new Schema ({
    question: String,
    answer: String,
    a: String,
    b: String,
    c: String,
    d: String,
    domain: String,

},

{
    timestamps: true
});

const Question = model('Question', questionsSchema);
export default Question;