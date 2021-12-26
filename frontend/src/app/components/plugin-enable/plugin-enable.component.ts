import { Component, OnInit } from '@angular/core';
import {DynamicDialogConfig, DynamicDialogRef} from "primeng/dynamicdialog";
import {ApiService} from "../../api.service";

@Component({
  selector: 't-plugin-enable',
  templateUrl: './plugin-enable.component.html',
  styleUrls: ['./plugin-enable.component.scss']
})
export class PluginEnableComponent implements OnInit {
  name: string;

  inProgress: boolean = false;

  constructor(private ref: DynamicDialogRef, private config: DynamicDialogConfig, private api: ApiService) {
    this.name = config.data.name;
  }

  ngOnInit(): void {
  }

  onSubmit(): void {
    this.inProgress = true;
    this.api.enablePlugin(this.name).subscribe(
      _ => {
        this.inProgress = false;
        this.ref.close(true);
      },
    )
  }

}
